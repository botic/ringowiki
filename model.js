var arrays = require('ringo/utils/arrays');

export('Page', 'PageIndex');

var {Store} = require('ringo-filestore');
var store = exports.store = new Store('/var/lib/ringojs/db');

// PageIndex is a singleton object that maps page names to page ids
var PageIndex = store.defineEntity('PageIndex', {properties: {
            map: "object"
        }});
var Page = store.defineEntity('Page', {properties: {
            name: "string",
            revisions: "array"
        }});

// create PageIndex singleton
var index = PageIndex.all()[0];
if (!index) {
    index = new PageIndex();
    index.map = {};
    index.save();
} else if (!index.map) {
    index.map = {};
}

PageIndex.prototype.updatePage = sync(function(oldName, newName, id) {
    if (oldName) {
        delete this.map[escapeName(oldName)];
    }
    if (newName && id != null) {
        this.map[escapeName(newName)] = id;
    }
    this.save();
}, store);

Page.byName = function(name) {
    name = escapeName(name);
    var pageId = index.map[name];
    var page = pageId != null && Page.get(pageId);
    if (!page) {
        var pages = Page.all().filter(function(page) {
            return name == page.name.toLowerCase().replace(/\s/g, '_');
        });
        page = pages[0];
        if (page) {
            index.updatePage(null, page.name, page._id);
        }
    }
    return page;
};

Page.prototype.addRevision = function(body, created) {
    if (typeof this.revisions === 'undefined') {
        this.revisions = [];
    }
    this.revisions.push({body: body, created: created});
};

Page.prototype.getRevision = function(version) {
    var rev = version ? this.revisions[version] : arrays.peek(this.revisions);
    return rev ? rev : {body: '', created: new Date()};
};

Page.prototype.updateFrom = function(obj) {
    if (this.name != obj.name) {
        index.updatePage(this.name, obj.name, this._id);
        this.name = obj.name;
    }
    this.addRevision(obj.body, new Date());
};

function escapeName(name) {
    return name ? name.toLowerCase().replace(/\s/g, '_') : null;
}
