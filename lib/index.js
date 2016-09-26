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

function templateInstance(data, templateFile) {
    var template = fs.readFileSync(templateFile, 'utf8');
    var output = mustache.render(template, data);
    console.log(output);
    return output;
}

function map(req, data, templateFile) {
    var elasticUrl = nconf.get('elastic-url') + req;
    console.log(elasticUrl);
    var query = templateInstance(data, templateFile);
    var reqStream = convertToStream(query).pipe(request.post(elasticUrl));
    var str = '';
    reqStream.on('data', function(buffer){
        var part = buffer.toString();
        str += part;
    });
    reqStream.on('end', function() {
        console.log(str);
        fs.writeFileSync('result/result.txt',str, {'flag' : 'a'});
        fs.writeFileSync('result/result.txt',"---------------------------------------------------\n", {'flag': 'a'});
    });
    reqStream.on('finish', function() {
        console.log("Finished request");
    });
};

function getParentIds(relations, i, callback, final) {
    var elasticUrl = nconf.get('elastic-url') +"/" + relations.index+ "/"+ relations.parents[i].parent +"/_search?pretty=true;size=10&from=10";
    var str = '';
    var reqStream = request.post(elasticUrl);
    reqStream.on('data', function(buffer){
        var part = buffer.toString();
        str += part;
    });
    reqStream.on('end', function() {
        console.log(str);
        var obj = JSON.parse(str);
        var ids = [];
        for (var k = 0; k < obj.hits.hits.length; k++) {
            ids.push(obj.hits.hits[k]._id);
        }
        callback(relations, i, ids, final);
    });
    reqStream.on('finish', function() {
        console.log("Finished request");
    });
}

function findChildRelations(relations, i, ids, final) {
    for (var k = 0; k< ids.length; k++) {
        for (var j = 0; j< relations.parents[i].children.length; j++) {
            var data = {parentId: ids[k], parentType: relations.parents[i].parent};
            map("/"+relations.index+"/"+relations.parents[i].children[j]+"/_search?pretty=true", data, "./template/has-parent-request.hbs");
        }
    }
}

function findSuitableData(relationFile) {
    var relations = JSON.parse(fs.readFileSync(relationFile, 'utf8'));
    for (var i = 0; i< relations.parents.length; i++) {
        getParentIds(relations, i, findChildRelations);
    }
}

findSuitableData('data/customer-relations.json');



