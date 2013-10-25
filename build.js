var fs = require('fs'),
  cheerio = require('cheerio'),
  clean = require('clean-css'),
  uglify = require('uglify-js'),
  zlib = require('zlib'),
  AWS = require('aws-sdk');

AWS.config.loadFromPath('./aws-cred.json');

var s3bucket = new AWS.S3({params: {Bucket: 'zooniverse-demo'}});
var $ = cheerio.load(fs.readFileSync("./public/index.html"));
var version = require('./package').version;

console.log("Building WISE Version: ", version);

// Upload Images

fs.readdir('./public/img', function(err, imgs) {
  if (err)
    return console.log("Failed to read img dir");
  imgs.forEach(function(img) {
    var contentType;
    fs.readFile('./public/img/' + img, function(err, file) {
      var fileType = img.split('.').slice(-1)[0];

      if (err)
        return console.log("Failed to read: ", img);
      if (fileType === 'svg')
        contentType = 'image/svg+xml';
      else if (fileType === 'jpg')
        contentType = 'image/jpeg';
      else
        contentType = 'image/png';
      s3bucket.putObject({
        ACL: 'public-read',
        Body: file,
        Key: 'wise/img/' + img,
        ContentType: contentType
      }, function(err) {
        if (err)
          console.log("Failed to upload: ", img)
        else
          console.log("Uploaded: ", img , " with MIME: ", contentType);
      });
    });
  });
});

// Compress CSS - Write to ./output/css/

console.log("Build CSS");

var cssInput = [
  "./public/css/app.css",
  "./public/css/vendor.css",
];

var css = clean.process(cssInput.map(function(f) {
  return fs.readFileSync(f);
}).join('\n'));

console.log("Upload CSS to s3");

zlib.gzip(css, function(err, result) {
  if (err)
    throw err;
  s3bucket.putObject({
    ACL: 'public-read',
    Body: result,
    Key: 'wise/css/style.' + version + '.css',
    ContentEncoding: 'gzip',
    ContentType: 'text/css'
  }, function(err) {
    if (err)
      console.log(err);
    else
      console.log('Uploaded css/style.css');
  });
});


// Compress JS - Write to ./output/js/

console.log("Build JS");

var jsInput = [
  "./public/js/vendor.js",
  "./public/js/app.js",
];

var js = uglify.minify(jsInput, {outSourceMap: 'app.js.map'});

console.log("Upload JS to s3");

zlib.gzip(js.code, function(err, result) {
  if (err)
    throw err;
  s3bucket.putObject({
    ACL: 'public-read',
    Body: result,
    Key: 'wise/js/app.' + version + '.js',
    ContentEncoding: 'gzip',
    ContentType: 'application/javascript'
  }, function(err) {
    if (err)
      console.log(err);
    else
      console.log('Uploaded js/app.js');
  });
});


// Modify and Save HTML

console.log("Update HTML");
$('link.removeable').remove();
$('script.removeable').remove();
$('head').append('<link rel="stylesheet" type="text/css" href="css/style.' + version + '.css">');
$('body').append('<script src="js/app.' + version + '.js" onload="require(' + "'init'" + ')();"></script>');

console.log("Upload HTML to s3");

zlib.gzip($.html(), function(err, result) {
  if (err)
    throw err;
  s3bucket.putObject({
    ACL: 'public-read',
    Body: result,
    Key: 'wise/index.html',
    ContentEncoding: 'gzip',
    CacheControl: 'no-cache, must-revalidate',
    ContentType: 'text/html'
  }, function(err) {
    if (err)
      console.log(err);
    else
      console.log('Uploaded index.html');
  });
});