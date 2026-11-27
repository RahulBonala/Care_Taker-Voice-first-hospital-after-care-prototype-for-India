'use strict';
require('./helpers').intentSuite('te', [
  ['కళ్ళు తిరుగుతున్నాయి', 'unwell'], ['ontlo baledu, noppi', 'unwell'],
  ['కాల్స్ ఆపండి', 'optOut'], ['calls vaddu', 'optOut'],
  ['నర్సుతో మాట్లాడాలి', 'wantPerson'], ['doctor tho matladali', 'wantPerson'],
  ['ఆమె ఇంట్లో లేరు', 'someoneElse'], ['amma intlo leru', 'someoneElse'],
  ['నేను మానేశాను', 'stopped'], ['nenu apesanu', 'stopped'],
  ['ఇంకా తినలేదు', 'notEaten'], ['inka tinaledu', 'notEaten', 30],
  ['అరగంట తర్వాత', 'later', 30], ['20 minutes tarvata call cheyandi', 'later', 20],
  ['వేసుకోలేదు', 'notTaken'], ['marchipoyanu', 'notTaken'],
  ['వేసుకున్నాను', 'taken'], ['tablets vesukunnanu', 'taken'],
  ['లేదు', 'no'], ['kaadu', 'no'],
  ['అవును', 'yes'], ['sare', 'yes'],
]);
