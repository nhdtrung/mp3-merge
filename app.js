const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const app = express();
const port = 3000;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function getRandomOrder(arr) {
  const result = [];
  while (arr.length > 0) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    result.push(arr.splice(randomIndex, 1)[0]);
  }
  return result;
}

function mergeMP3Files(inputFiles, outputFile, res) {
  const tempOutputFile = `${outputFile}.tmp.mp3`;

  let command = ffmpeg();
  inputFiles.forEach((file) => {
    console.log(file.fileName);
    command = command.input(file);
  });

  command
    .on('error', (err) => {
      console.error('An error occurred:', err.message);
      res.render('error', { error: err.message });
    })
    .on('end', () => {
      fs.renameSync(tempOutputFile, outputFile);
      console.log('Merging complete:', outputFile);
      res.render('success', { outputFile });
    })
    .mergeToFile(tempOutputFile, __dirname);
}

function getMP3FilesFromDirectory(directory) {
  const files = fs.readdirSync(directory);
  return files.filter((file) => path.extname(file).toLowerCase() === '.mp3')
              .map((file) => path.join(directory, file));
}

function getRandomUniqueFiles(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  const uniqueFiles = Array.from(new Set(shuffled.slice(0, count)));
  if (uniqueFiles.length === count) {
    return uniqueFiles;
  } else {
    const remainingCount = count - uniqueFiles.length;
    const remainingFiles = arr.filter(file => !uniqueFiles.includes(file));
    const additionalFiles = getRandomUniqueFiles(remainingFiles, remainingCount);
    return uniqueFiles.concat(additionalFiles);
  }
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  const inputDirectory = './mp3';
  const inputFiles = getMP3FilesFromDirectory(inputDirectory);
  res.render('index', { inputFiles });
});

app.post('/merge', (req, res) => {
  const { numFiles, outputFile } = req.body;
  const inputDirectory = './mp3';
  const inputFiles = getMP3FilesFromDirectory(inputDirectory);

  if (inputFiles.length === 0) {
    res.render('error', { error: 'No MP3 files found in the directory.' });
  } else if (numFiles < 1 || numFiles > inputFiles.length) {
    res.render('error', { error: 'Invalid number of files selected for merging.' });
  } else {
    const selectedFiles = getRandomUniqueFiles(inputFiles, numFiles);
    mergeMP3Files(selectedFiles, `${outputFile}.mp3`, res);
  }
});


app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
