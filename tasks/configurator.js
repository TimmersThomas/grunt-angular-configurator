/**
 * grunt-angular-configurator
 * @author vitre
 * @contributor Thomas Timmers
 * @licence MIT
 * @version 0.1.3
 * @url https://github.com/TimmersThomas/grunt-angular-configurator
 */

'use strict';

var _ = require('lodash'),
    path = require('path'),
    fs = require('fs');

function generateTemplateSimple() {
    var content = "'use strict';\n" +
        "angular.module('<%= module %>')\n" +
        "    .constant('<%= variable %>',";

    return content;
};

function generateTemplateBrowserified() {
    var content = "" +
        "'use strict';\n\n" +
        "exports.inject = function (appModule) {\n" +
        "   appModule.constant('<%= variable %>', exports.constant);\n" +
        "   return exports.constant;\n" +
        "};\n\n" +
        "exports.constant = ";

    return content;
};


function generateConfiguration(grunt, options) {
    var files = grunt.file.expand({filter: 'isDirectory'}, options.search_base + '*');

    var config = {},
        states = {};

    _.forEach(files, function (dir) {
        var module = path.basename(dir),
            configFile = path.resolve(dir, options.config_folder, options.config_file_config),
            stateFile = path.resolve(dir, options.config_folder, options.config_file_state);

        if (fs.existsSync(configFile)) {
            _.merge(config, grunt.file.readJSON(configFile));
        }

        if (fs.existsSync(stateFile)) {
            _.merge(states, {
                states: _.mapValues(grunt.file.readJSON(stateFile), function (state) {
                    return _.extend({
                        'module': module
                    }, state);
                })
            });
        }
    });

    config = _.merge(
        {},
        states,
        config,
        grunt.file.readJSON(path.resolve(options.general_config_folder, 'config.json')),
        grunt.file.readJSON(path.resolve(options.general_config_folder, 'config_' + options.env + '.json'))
    );

    return config;
}

module.exports = function (grunt) {

    grunt.registerTask('ng_config_configurator', 'Generate a configuration based on the current ENVIRONMENT', function (envTarget) {
        var environment = envTarget || grunt.config('env');

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            "env": environment,
            "general_config_folder": "app/scripts/_config/",
            "search_base": "app/scripts/",
            "config_folder": "config",
            "config_file_config": "config.json",
            "config_file_state": "states.json",
            "export_module": "app.common",
            "export_variable": "config",
            "export_dest": "app/scripts/common/config/config.js",
            "browserify": true
        });

        var template = generateTemplateSimple(),
            configuraton = generateConfiguration(grunt, options);

        if (options.browserify) {
            template = generateTemplateBrowserified();
        }

        var templateData = {
            "module": options.export_module,
            "variable": options.export_variable
        };

        var generatedContent = grunt.template.process(template,{ data: templateData});
        generatedContent += JSON.stringify(configuraton, null, 4);

        if (options.browserify == false) {
            generatedContent += ");";
        }
        else {
            generatedContent += ";";
        }

        grunt.file.write(options.export_dest, generatedContent);
        grunt.log.ok('Generated ' + options.export_dest);
    });
};