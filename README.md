# multilingual-jaded-brunch
A brunch plugin to compile multilingual jade(pug) templates

## Install

Add `"multilingual-jaded-brunch": "secretworry/multilingual-jaded-brunch"` to your `package.json`.

This will install `multilingual-jaded-brunch` and compile all your static jade under `app/static` to your public directory.
All the locales will be discovered under `locales` directory.
Each jade file will be compiled for all the specified locales, and exported with `{locale}.html` as filename. For example, if we support, `["zh", "en"]` as locale, the `index.jade` will be compiled to `index.zh.jade` and `index.en.jade`.
Particularly, the `defaultLocale`( by default the first in the locales list), will be used to generate the default file, i.e. the filename without locale specified.

## Usage

all the default options a list below
```coffeescript
plugins:
  multilingualJaded:
    locales: undefined // By default, will be deduced by using i18n.getLocales()
    i18nConfig:
      directory: './locales'
      objectNotation: true
    defaultLocale: undefined // by default, will be the first in the locales
    module: 'jade' // the module used to compile(may use to replace jade with pug)
    formater: (props)-> "#{props.filename}.#{props.locale}#{props.extname}"
```
