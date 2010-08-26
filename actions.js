var dates = require('ringo/utils/dates');
var strings = require('ringo/utils/strings');
var {Response} = require('ringo/webapp/response');
var {Page} = require('./model');
var {toUrl} = require('./helpers');

exports.index = function(req, name, action) {
    name = name || 'home';
    var page = Page.byName(name);
    if (page) {
        var skin, title;
        if (name.toLowerCase() == 'home') {
            skin = module.resolve('skins/index.html');
        } else {
            skin = module.resolve('skins/page.html');
            title = page.name;
        }
        page.body = page.getRevision(req.params.version).body;
        return Response.skin(skin, {page: page, title: title, version: version});
    } else {
        return createPage(name, req);
    }
};

exports.edit = function(req, name) {
    var page = Page.byName(name);
    return updatePage(page, req);
};

exports.list = function(req) {
    return Response.skin(module.resolve('skins/list.html'), {
            pages: Page.all().sort(strings.Sorter('name'))});
};

exports.recent = function(req) {
    var limit = req.params.limit || 50;
    var changes = [];

    // Retrieve all changes.
    for each (var page in Page.all()) {
        for (var version in page.revisions) {
            changes.push({
                    page: page,
                    version: version,
                    created: new Date(page.revisions[version].created)});
        }
    }

    // Sort them reverse chronologically.
    changes.sort(function (a, b) a.created > b.created ? -1 : 1);

    // Group changes by day.
    // @@ We probably should not manually do the grouping here, but rather use
    // a nice grouping function in some library somewhere.
    var days = [];
    var oldDay;
    for each (var change in changes.slice(0, limit)) {
        var curDay = dates.format(change.created, 'yyyy-MM-dd');
        if (curDay != oldDay) {
            days.push({title: curDay, changes: []});
            oldDay = curDay;
        }
        days[days.length - 1].changes.push(change);
    }
    return Response.skin(module.resolve('skins/recent.html'), {days: days});
};

function updatePage(page, req) {
    if (req.isPost && req.params.save) {
        if (!req.session.data.honeyPotName || req.params[req.session.data.honeyPotName]) {
            throw "Bot detected. <h1>If you are not a bot complain in our mailinglist.</h1>";
        }

        page.updateFrom(req.params);
        page.save();
        return Response.redirect(toUrl(page.name));
    }
    page.body = page.getRevision(req.params.version).body;
    req.session.data.honeyPotName = "phonenumber_" + parseInt(Math.random() * 1000);
    return Response.skin(module.resolve('skins/edit.html'), {
        page: page,
        honeyPotName: req.session.data.honeyPotName,
    });
}

function createPage(name, req) {
    if (req.isPost && req.params.save) {
        var page = new Page();
        page.updateFrom(req.params);
        page.save();
        return Response.redirect(toUrl(page.name));
    }
    return Response.skin(module.resolve('skins/new.html'), {name: name.replace(/_/g, ' ')});
}

