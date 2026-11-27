'use strict';
require('./helpers').intentSuite('en', [
  ['I feel dizzy', 'unwell'], ['I have chest pain', 'unwell'],
  ['please stop calls', 'optOut'], ['do not call me again', 'optOut'],
  ['I want to talk to a nurse', 'wantPerson'], ['can I speak to someone', 'wantPerson'],
  ['she is not at home', 'someoneElse'], ['this is her son', 'someoneElse'],
  ['I feel fine, I have stopped', 'stopped'], ['I stopped taking them', 'stopped'],
  ['I have not eaten yet', 'notEaten'], ['haven\'t eaten', 'notEaten'],
  ['call me in half an hour', 'later', 30], ['later please', 'later', 30],
  ['I have not taken it', 'notTaken'], ['I forgot', 'notTaken'],
  ['I took it', 'taken'], ['yes I have taken them', 'taken'],
  ['no', 'no'], ['that is wrong', 'no'],
  ['yes', 'yes'], ['correct', 'yes'],
]);
