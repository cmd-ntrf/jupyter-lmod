function getCookie(name) {
  var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
  return r ? r[1] : undefined;
}

class Lmod {
  constructor(base_url) {
    this.url = base_url + 'lmod'
    this._xsrf = getCookie("_xsrf");
  }

  async avail() {
    const response = await fetch(this.url + '/modules');
    if (response.status == 200) {
      return response.json();
    }
  }

  async list(include_hidden=false) {
    let url = this.url;
    if (include_hidden) {
      url += '?all=true';
    }
    const response = await fetch(url);
    if (response.status == 200) {
      return response.json();
    }
  }

  async load(modules) {
    const data = {
      'modules' : modules,
    };
    const response = await fetch(
      this.url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRFToken': this._xsrf
        },
        body: JSON.stringify(data),
      }
    )
    return response.json();
  }

  async restore(name) {
    const data = {
      'name' : name,
    };
    const response = await fetch(
      this.url + '/collections',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRFToken': this._xsrf
        },
        body: JSON.stringify(data),
      }
    )
    return response.json();
  }

  async save(name) {
    const data = {
      'name' : name,
    };
    const response = await fetch(
      this.url + '/collections',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRFToken': this._xsrf
        },
        body: JSON.stringify(data),
      }
    )
    return response.json();
  }

  async savelist() {
    const response = await fetch(this.url + '/collections');
    if (response.status == 200) {
      return response.json();
    }
  }

  async show(module) {
    const response = await fetch(this.url + '/modules/' + module);
    if (response.status == 200) {
      return response.json();
    }
  }

  async freeze() {
    const response = await fetch(this.url + '?lang=python');
    if (response.status == 200) {
      return response.json();
    }
  }

  async unload(modules) {
    const data = {
      'modules' : modules,
    };
    const response = await fetch(
      this.url,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRFToken': this._xsrf
        },
        body: JSON.stringify(data),
      }
    )
    return response.json();
  }

  async paths() {
    const response = await fetch(this.url + '/paths');
    if (response.status == 200) {
      return response.json();
    }
  }

  async folders(path) {
    const response = await fetch(this.url + '/folders/' + path);
    if (response.status == 200) {
      return response.json();
    }
  }

  async use(paths, append=false) {
    const data = {
      'paths' : paths,
      'append' : append,
    };
    const response = await fetch(
      this.url + '/paths',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRFToken': this._xsrf
        },
        body: JSON.stringify(data),
      }
    )
    return response.json();
  }

  async unuse(paths) {
    const data = {
      'paths' : paths,
    };
    const response = await fetch(
      this.url + '/paths',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRFToken': this._xsrf
        },
        body: JSON.stringify(data),
      }
    )
    return response.json();
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
