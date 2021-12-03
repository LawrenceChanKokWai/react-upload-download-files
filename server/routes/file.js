const path = require("path");
const express = require("express");
const multer = require("multer");
const File = require("../model/file");
const Router = express.Router();
const fs = require('fs');

const AWS = require('aws-sdk');
AWS.config.update(
	{
		accessKeyId: "AKIAWCMLHHBROE7GX57K",
		secretAccessKey: "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",
		region: 'ap-southeast-1'
	}
);

var s3 = new AWS.S3();

const upload = multer({
	storage: multer.diskStorage({
		filename(req, file, cb) {
			cb(null, `${new Date().getTime()}_${file.originalname}`);
		},
	}),
	fileFilter(req, file, cb) {
		if (!file.originalname.match(/\.(jpeg|jpg|png|pdf|doc|docx|xlsx|xls)$/)) {
			return cb(
				new Error(
					"only upload files with jpg, jpeg, png, pdf, doc, docx, xslx, xls format.",
				),
			);
		}
		cb(undefined, true); // continue with upload
	},
});

Router.post("/upload", upload.single("file"), async (req, res) => {
	try {
		const { title, description } = req.body;
		const { path, mimetype } = req.file;
		const file = new File({
			title,
			description,
			file_name: req.file.originalname,
			file_path: path,
			file_mimetype: mimetype,
		});
		await file.save();
		res.send("file uploaded successfully.");
	} catch (error) {
		res.status(400).send("Error while uploading file. Try again later.");
	}
},
	(error, req, res, next) => {
		if (error) {
			res.status(500).send(error.message);
		}
	},
);

Router.get("/getAllFiles", async (req, res) => {
	try {
		const files = await File.find({});
		const sortedByCreationDate = files.sort(
			(a, b) => b.createdAt - a.createdAt,
		);
		res.send(sortedByCreationDate);
	} catch (error) {
		res.status(400).send("Error while getting list of files. Try again later.");
	}
});

Router.get("/download/:id", async (req, res) => {
	try {
		const file = await File.findById(req.params.id);
		res.set({
			"Content-Type": file.file_mimetype,
		});
		console.log(`${file.file_name}`);

		const options = {
			Bucket: 'upload-test-file',
			Key: file.file_name,
		};

		const fileStream = s3.getObject(options).createReadStream();
		fileStream.pipe(res);

	} catch (error) {
		res.status(400).send("Error while downloading file. Try again later.");
	}
});

Router.get("/list/:id", async (req, res) => {
	try {
		// const id = req.params.id;
		const file = await File.findById(req.params.id);
		var params = { Bucket: 'upload-test-file', Key: file.file_name };

		s3.deleteObject(params, function (err, data) {
			if (err) console.log(err, err.stack);  // error
			else console.log();                 // deleted
		});
		await File.findByIdAndDelete(req.params.id);
		window.location.reload();
	} catch (error) {
		res.status(400).send("Error while downloading file. Try again later.");
	}
});

module.exports = Router;
