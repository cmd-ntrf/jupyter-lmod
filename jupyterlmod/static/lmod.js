function getCookie(name) {
  var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
  return r ? r[1] : undefined;
}

var $ = require('jquery');

class Lmod {
  constructor(base_url) {
    this._available = null;
    this._loaded = null;
    this._savelist = null;
    this.url = base_url + 'lmod/'
    this._xsrf = getCookie("_xsrf");
  }

  avail() {
    if(this._available == null){
      this._available = this.get('avail', {});
    }
    return this._available;
  }

  list() {
    if(this._loaded == null) {
      this._loaded = this.get('list', {});
    }
    return this._loaded;
  }

  load(modules) {
    this._available = null;
    this._loaded = null;
    return this.post('load', {'args' : modules});
  }

  restore(name) {
    this._available = null;
    this._loaded = null;
    return this.post('restore', {'args' : name});
  }

  save(name) {
    this._savelist = null;
    return this.post('save', {'args' : name});
  }

  savelist() {
    if (this._savelist == null) {
      this._savelist = this.get('savelist', {});
    }
    return this._savelist;
  }

  show(module) {
    return this.get('show', {'args' : module});
  }

  unload(modules) {
    this._available = null;
    this._loaded = null;
    return this.post('unload', {'args' : modules});
  }

  get(action, options) {
    return $.ajax({
            url: this.url + action,
            type: "GET",
            dataType: "json",
            data: options,
            traditional: true
        });
  }

  post(action, options) {
    options['_xsrf'] = this._xsrf;
        return $.ajax({
            url: this.url + action,
            type: "POST",
            dataType: "json",
            data: options,
            traditional: true
        });
  }
}

define({
  Lmod : Lmod
});

// Export is only used for TS. Try/Catch to avoid error in JS
try {
  exports.Lmod = Lmod;
}
catch (ReferenceError) {}
