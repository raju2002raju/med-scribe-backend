let inputLanguage = 'English';
let outputLanguage = 'English';

function setLanguages(input, output) {
    inputLanguage = input;
    outputLanguage = output;
}

function getLanguages() {
    return { inputLanguage, outputLanguage };
}

module.exports = { setLanguages, getLanguages };