const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema({
    transcript: String,
    title: String,
    createdAt: { type: Date, default: Date.now }
});

const Transcript = mongoose.model('Transcript', transcriptSchema);

const clientDataSchema = new mongoose.Schema({
    opportunities: Array,
    visitedClients: Array
});
const ClientData = mongoose.model('ClientData', clientDataSchema);

module.exports = {
    Transcript,
    ClientData
};
