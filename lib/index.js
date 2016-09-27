/**
 *
 * Created by pavelnovotny on 26.09.16.
 */
var path = require("path");
var request = require("request");
var nconf = require('nconf');
var mustache = require('mustache');
var async = require('async');
var fs = require('fs');
var Readable = require('stream').Readable

nconf.argv()
    .env()
    .defaults({ env : 'production' })
    .file({ file: 'config-'+nconf.get('env')+'.json' });


function convertToStream(string) {
    var stream = new Readable();
    stream.push(string);
    stream.push(null);
    return stream;
}

function searchDocuments(data, templateFile) {
    var template = fs.readFileSync(templateFile, 'utf8');
    var output = mustache.render(template, data);
    var obj = JSON.parse(output);
    var elasticUrl = nconf.get('elastic-url') + obj.url;
    var query = JSON.stringify(obj.elastic);
    convertToStream(query).pipe(request.post(elasticUrl)).pipe(fs.createWriteStream(obj.result)) ;
};

searchDocuments({}, "template/customer.hbs");


