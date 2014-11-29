/* jshint unused: false */

var vows = require('vows');
var assert = require('assert');
var http = require('http');
var nock = require('nock');
var CleanCSS = require('../index');

var port = 24682;

if (process.platform == 'win32')
  return;

vows.describe('protocol imports').addBatch({
  'of a missing file': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/missing.css')
        .reply(404);

      new CleanCSS().minify('@import url(http://127.0.0.1/missing.css);a{color:red}', this.callback);
    },
    'should raise error': function(errors, minified) {
      assert.equal(errors.length, 1);
    },
    'should ignore @import': function(errors, minified) {
      assert.equal(minified.styles, '@import url(http://127.0.0.1/missing.css);a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/present.css')
        .reply(200, 'p{font-size:13px}');

      new CleanCSS().minify('@import url(http://127.0.0.1/present.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'p{font-size:13px}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file with spaces in path': {
    topic: function() {
      this.reqMocks = nock('http://fonts.googleapis.com')
        .get('/css?family=Oleo%20Script%20Swash%20Caps')
        .reply(200, 'p{font-size:13px}');

      new CleanCSS().minify('@import url(\'//fonts.googleapis.com/css?family=Oleo Script Swash Caps\');', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'p{font-size:13px}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file via HTTPS': {
    topic: function() {
      this.reqMocks = nock('https://127.0.0.1')
        .get('/present.css')
        .reply(200, 'p{font-size:13px}');

      new CleanCSS().minify('@import url(https://127.0.0.1/present.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'p{font-size:13px}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file with media': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/present.css')
        .reply(200, 'p{font-size:13px}');

      new CleanCSS().minify('@import url(http://127.0.0.1/present.css) screen;a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, '@media screen{p{font-size:13px}}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file with dependencies': {
    topic: function() {
      this.reqMocks1 = nock('http://127.0.0.1')
        .get('/present.css')
        .reply(200, '@import url(/vendor/reset.css);@import url(https://assets.127.0.0.1/base.css);p{font-size:13px}')
        .get('/vendor/reset.css')
        .reply(200, 'body{margin:0}');
      this.reqMocks2 = nock('https://assets.127.0.0.1')
        .get('/base.css')
        .reply(200, 'div{padding:0}');

      new CleanCSS().minify('@import url(http://127.0.0.1/present.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'body{margin:0}div{padding:0}p{font-size:13px}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks1.isDone(), true);
      assert.equal(this.reqMocks2.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file with relative dependencies': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/nested/present.css')
        .reply(200, '@import url(../vendor/reset.css);p{font-size:13px}')
        .get('/vendor/reset.css')
        .reply(200, 'body{margin:0}');

      new CleanCSS().minify('@import url(http://127.0.0.1/nested/present.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'body{margin:0}p{font-size:13px}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file missing relative dependency': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/nested/present.css')
        .reply(200, '@import url(../missing.css);p{font-size:13px}')
        .get('/missing.css')
        .reply(404);

      new CleanCSS().minify('@import url(http://127.0.0.1/nested/present.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0], 'Broken @import declaration of "http://127.0.0.1/missing.css" - error 404');
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, '@import url(http://127.0.0.1/missing.css);p{font-size:13px}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file with URLs to rebase': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/urls.css')
        .reply(200, 'a{background:url(test.png)}');

      new CleanCSS().minify('@import url(http://127.0.0.1/urls.css);', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'a{background:url(http://127.0.0.1/test.png)}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of an existing file with relative URLs to rebase': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/base.css')
        .reply(200, '@import url(deeply/nested/urls.css);')
        .get('/deeply/nested/urls.css')
        .reply(200, 'a{background:url(../images/test.png)}');

      new CleanCSS().minify('@import url(http://127.0.0.1/base.css);', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'a{background:url(http://127.0.0.1/deeply/images/test.png)}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of a non-resolvable domain': {
    topic: function() {
      new CleanCSS().minify('@import url(http://notdefined.127.0.0.1/custom.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.equal(errors.length, 1);
      assert.include(errors[0], 'Broken @import declaration of "http://notdefined.127.0.0.1/custom.css"');
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, '@import url(http://notdefined.127.0.0.1/custom.css);a{color:red}');
    }
  },
  'of a 30x response with absolute URL': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/moved.css')
        .reply(301, '', { 'Location': 'http://127.0.0.1/present.css' })
        .get('/present.css')
        .reply(200, 'body{margin:0}');

      new CleanCSS().minify('@import url(http://127.0.0.1/moved.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'body{margin:0}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of a 30x response with relative URL': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/moved.css')
        .reply(301, '', { 'Location': '/present.css' })
        .get('/present.css')
        .reply(200, 'body{margin:0}');

      new CleanCSS().minify('@import url(http://127.0.0.1/moved.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'body{margin:0}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of a timed out response': {
    topic: function() {
      var self = this;
      var timeout = 100;
      this.server = http.createServer(function(req, res) {
        setTimeout(function() {}, timeout * 2);
      });
      this.server.listen(port, function() {
        new CleanCSS({
          inliner: {
            timeout: timeout
          }
        }).minify('@import url(http://localhost:' + port + '/timeout.css);a{color:red}', self.callback);
      });
    },
    'should raise errors': function(errors, minified) {
      assert.equal(errors.length, 1);
      assert.equal(errors[0], 'Broken @import declaration of "http://localhost:' + port + '/timeout.css" - timeout');
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, '@import url(http://localhost:' + port + '/timeout.css);a{color:red}');
    },
    teardown: function() {
      this.server.close();
    }
  },
  'of a cyclical reference response': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/one.css')
        .reply(200, '@import url(/two.css);div{padding:0}')
        .get('/two.css')
        .reply(200, '@import url(http://127.0.0.1/two.css);body{margin:0}');

      new CleanCSS().minify('@import url(http://127.0.0.1/one.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'body{margin:0}div{padding:0}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of a resource without protocol': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .get('/no-protocol.css')
        .reply(200, 'div{padding:0}');

      new CleanCSS().minify('@import url(//127.0.0.1/no-protocol.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'div{padding:0}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of a resource available via POST only': {
    topic: function() {
      this.reqMocks = nock('http://127.0.0.1')
        .post('/computed.css')
        .reply(200, 'div{padding:0}');

      new CleanCSS({
        inliner: {
          request: {
            method: 'POST'
          }
        }
      }).minify('@import url(http://127.0.0.1/computed.css);a{color:red}', this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'div{padding:0}a{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of a remote resource mixed with local ones': {
    topic: function() {
      var source = '@import url(http://127.0.0.1/remote.css);@import url(test/data/partials/one.css);';
      this.reqMocks = nock('http://127.0.0.1')
        .get('/remote.css')
        .reply(200, 'div{padding:0}');

      new CleanCSS().minify(source, this.callback);
    },
    'should not raise errors': function(errors, minified) {
      assert.isNull(errors);
    },
    'should process @import': function(errors, minified) {
      assert.equal(minified.styles, 'div{padding:0}.one{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), true);
      nock.cleanAll();
    }
  },
  'of a remote resource mixed with local ones but no callback': {
    topic: function() {
      var source = '@import url(http://127.0.0.1/remote.css);@import url(test/data/partials/one.css);';
      this.reqMocks = nock('http://127.0.0.1')
        .get('/remote.css')
        .reply(200, 'div{padding:0}');

      var minifier = new CleanCSS();
      var minified = minifier.minify(source);
      this.callback(null, minifier, minified);
    },
    'should not raise errors': function(error, minifier) {
      assert.isEmpty(minifier.errors);
    },
    'should raise warnings': function(error, minifier) {
      assert.equal(minifier.warnings.length, 1);
      assert.match(minifier.warnings[0], /no callback given/);
    },
    'should process @import': function(error, minifier, minified) {
      assert.equal(minified.styles, '@import url(http://127.0.0.1/remote.css);.one{color:red}');
    },
    teardown: function() {
      assert.equal(this.reqMocks.isDone(), false);
      nock.cleanAll();
    }
  }
}).export(module);
