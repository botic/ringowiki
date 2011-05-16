var {Sorter} = require('ringo/utils/strings');
var {redirect} = require('ringo/jsgi/response');
var {Page} = require('./model');
var {Application} = require("stick");

var app = exports.app = Application();
app.configure("params", "render", "route");
app.render.base = module.resolve("templates");
app.render.master = "base.html";
app.render.helpers = require("./helpers");

app.get("/list", function(req) {
    return app.render('list.html', {
        pages: Page.all().sort(Sorter('name'))
    });
});

app.get("/:name?", function(req, name) {
    name = name || 'home';
    var page = Page.byName(name);
    if (page) {
        var skin, title;
        if (name.toLowerCase() == 'home') {
            skin = 'index.html';
        } else {
            skin = 'page.html';
            title = page.name;
        }
        page.body = page.getRevision(req.params.version).body;
        return app.render(skin, {
            page: page,
            title: title,
            headline: title,
            version: version,
            basePath: req.scriptName
        });
    } else {
        return app.render('new.html', {
            name: name.replace(/_/g, ' ')
        });
    }
});

app.post("/:name?", function(req, name) {
    name = name || 'home';
    var page = new Page();
    page.updateFrom(req.params);
    page.save();
    return redirect(req.scriptName + "/" + encodeURIComponent(name));
});

app.get("/:name/edit", function(req, name) {
    var page = Page.byName(name);
    page.body = page.getRevision(req.params.version).body;
    req.session.data.honeyPotName = "phonenumber_" + parseInt(Math.random() * 1000);
    return app.render('edit.html', {
        page: page,
        honeyPotName: req.session.data.honeyPotName,
    });
});

app.post("/:name/edit", function(req, name) {
    if (!req.session.data.honeyPotName || req.params[req.session.data.honeyPotName]) {
        throw "Bot detected. <h1>If you are not a bot complain in our mailinglist.</h1>";
    }
    var page = Page.byName(name);
    page.updateFrom(req.params);
    page.save();
    return redirect(req.scriptName + "/" + encodeURIComponent(name));
});

