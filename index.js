'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var i18n = require('i18n');
var progeny = require('progeny');

function localRequire(module) {
  try {
    var modulePath = path.join(process.cwd(), 'node_modules', module);
    return require(modulePath);
  } catch(userError) {
    if (userError.code !== "MODULE_NOT_FOUND") {
      throw userError;
    }
    try {
      return require(module);
    } catch(localError) {
      throw localError;
    }
  }
}

function defaultFormater(props) {
  return path.join(props.locale, props.filename + props.extname);
}

var DEFAULT_PROPERTIES = {
  extension: 'jade',
  jadeOptions: {},
  staticPath: 'app/static',
  outputPath: 'public',
  projectPath: path.resolve(process.cwd())
};

var exportFile = function(targetPath, source) {
  var targetDirectory = path.dirname(targetPath);
  return new Promise(function(resolve, reject) {
    mkdirp(targetDirectory, function(err) {
      if (err) {
        reject(err);
      } else {
        fs.writeFile(targetPath, source, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  });
};


class MultilingualJadedCompile {
  constructor(config) {
    _.assignIn(this, DEFAULT_PROPERTIES);
    this.config = (config.plugins && config.plugins.multilingualJaded) || {};
    var i18nConfig = _.extend({}, MultilingualJadedCompile.I18N_DEFAULT_CONFIG, this.config.i18nConfig);
    if (this.config.locales && !i18nConfig.locales) {
      i18nConfig.locales = this.config.locales;
    }
    i18n.configure(i18nConfig);
    if (this.config.defaultLocale) {
      this.defaultLocale = this.config.defaultLocale;
    } else {
      this.defaultLocale = i18n.getLocales()[0];
    }
    this.locals = this.config.locals || {};
    var jade = this.config.module || 'jade';
    this.jade = localRequire(jade);
    this.jadeOptions = _.omit(this.config, _.words("staticPatterns path module formater extension locales defaultLocale"));
    if (!this.jadeOptions.compileDebug) {
      this.jadeOptions.compileDebug = !config.optimize;
    }
    if (!this.jadeOptions.pretty) {
      this.jadeOptions.pretty = !config.optimize;
    }
    this.formater = this.config.formater || defaultFormater;
    if (this.config.path) {
      this.staticPath = this.config.path;
    }
    this.staticPath = path.resolve(this.staticPath);

    if (this.config.outputPath) {
      this.outputPath = this.config.outputPath;
    } else if (config.paths && config.paths.public) {
      this.outputPath = config.paths.public;
    }

    var jadePath = path.dirname(require.resolve('jade'));
    this.include = [
      path.join(jadePath, '..', 'runtime.js')
    ];
    var discoverDependencies = progeny({rootPath: config.paths.root});
    this.getDependencies = function(compiler, data, path) {
      return discoverDependencies(data, path, compiler);
    };
  }

  compile(file) {
    var templatePath = path.resolve(file.path),
        relativePath = path.relative(this.projectPath, templatePath);
    if (!templatePath.startsWith(this.staticPath)) {
      return Promise.resolve(file);
    }
    var locales = i18n.getLocales();
    var options = _.extend({}, this.jadeOptions);
    options.filename = relativePath;
    var locals = _.extend({}, this.locals);
    locals.t = function() {
      return i18n.__.apply(i18n, arguments);
    };
    locals.tn = function() {
      return i18n.__n.apply(i18n, arguments);
    };

    var $this = this;
    return _.reduce(locales, function(result, locale) {
      return result.then(function() {
        i18n.setLocale(locale);
        var template = $this.jade.compile(file.data, options),
            source = template(_.defaults(locals, {filename: relativePath}));
        var filepath = path.relative($this.staticPath, templatePath),
            extname = path.extname(filepath),
            directory = path.dirname(filepath),
            filename = path.basename(filepath, extname),
            targetPath = path.join($this.outputPath, $this.formater({filename: filename, locale: locale, extname: ".html"}));
        return exportFile(targetPath, source).then(function() {
          if (locale === $this.defaultLocale) {
            var targetPath = path.join($this.outputPath, directory, filename + ".html");
            return exportFile(targetPath, source);
          } else {
            return;
          }
        });
      });
    }, Promise.resolve());
  }
}

MultilingualJadedCompile.I18N_DEFAULT_CONFIG = {
  directory: './locales',
  objectNotation: true,
};
MultilingualJadedCompile.prototype.brunchPlugin = true;
MultilingualJadedCompile.prototype.type = 'template';
MultilingualJadedCompile.prototype.extension = 'jade';

module.exports = MultilingualJadedCompile;
