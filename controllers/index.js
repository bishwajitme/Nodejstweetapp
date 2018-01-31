var express = require('express');
var fs = require('fs');
var twit = require('twit');
var config = require('../config/config.js');
var T = new twit(config);
var router = express.Router();
const fileUpload = require('express-fileupload');
const getDuration = require('get-video-duration');


// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
	res.render('index');
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
}


router.use(fileUpload());
router.use(express.static(__dirname));

router.post('/upload', function(req, res) {


    req.checkBody('tweettext', 'Tweet text is required').notEmpty();
    //req.checkBody('sampleFile', 'file is required').notEmpty();

    req.checkBody('sampleFile', 'Please upload your file in PNG/JPG/GIF/MP4 format').isPNG(req.files.sampleFile.name);
    req.checkBody('sampleFile', 'Your video duration is more than 30s. Please upload video under 30s.').videoDuration(req.body.video_duration);

    if(req.body.file_type === 'video/mp4'){
        req.checkBody('sampleFile', 'Please upload file less than 15MB').videosize(req.body.video_size, req.body.file_type);
    }
    else {
        req.checkBody('sampleFile', 'Please upload file less than 5MB').videosize(req.body.video_size, req.body.file_type);
    }

    //req.checkBody('tweettext', 'Tweet text is required').notEmpty();
    //req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if(errors){
        res.render('index',{
            errors:errors
        });
    } else {

        // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
        let sampleFile = req.files.sampleFile;
        let fileName = req.files.sampleFile.name;
        let tweettext = req.body.tweettext;
        let mimetype = req.files.sampleFile.mimetype;
        console.log(mimetype);


        // Use the mv() method to place the file somewhere on your server
        sampleFile.mv(__dirname + '/upload/' + fileName, function (err) {
            if (err)
                return res.status(500).send(err);
            if (mimetype === 'video/mp4') {
                var filePath = __dirname + '/upload/' + fileName;

               

                T.postMediaChunked({file_path: filePath}, function (err, data, response) {
                    console.log(data)
                    var videoIdStr = data.media_id_string
                    var altText = "Small flowers in a planter on a sunny balcony, blossoming."
                    var meta_params = {media_id: videoIdStr, alt_text: {text: altText}}

                    T.post('media/metadata/create', meta_params, function (err, data, response) {
                        if (!err) {
                            // now we can reference the media and post a tweet (media will attach to the tweet)
                            var params = {status: tweettext, media_ids: [videoIdStr]}

                            T.post('statuses/update', params, function (err, data, response) {
                                console.log(data);
                                //console.log(response);
                            })
                        }
                    })
                })
            }
            else {
                //res.send('File uploaded!');
                var b64content = fs.readFileSync(__dirname + '/upload/' + fileName, {encoding: 'base64'})

// first we must post the media to Twitter
                T.post('media/upload', {media_data: b64content}, function (err, data, response) {
                    // now we can assign alt text to the media, for use by screen readers and
                    // other text-based presentations and interpreters
                    if (!err) {
                        var mediaIdStr = data.media_id_string
                        var altText = "Small flowers in a planter on a sunny balcony, blossoming."
                        var meta_params = {media_id: mediaIdStr, alt_text: {text: altText}}
                    }
                    else{
                        req.flash('error', err);
                    }

                    T.post('media/metadata/create', meta_params, function (err, data, response) {
                        if (!err) {
                            // now we can reference the media and post a tweet (media will attach to the tweet)
                            var params = {status: tweettext, media_ids: [mediaIdStr]}

                            T.post('statuses/update', params, function (err, data, response) {
                                console.log(data);


                            })
                        }
                    })
                })
            }
        });
        req.flash('success_msg', 'Your tweet has been published. You can see now at <a href="https://twitter.com/jamin14_ben/" target="_blank">https://twitter.com/jamin14_ben/</a>');
        res.redirect('/');
    }
});

module.exports = router;