'use strict';
require('./helpers').intentSuite('hi', [
  ['haan le li, lekin chakkar aa raha hai', 'unwell'], ['tabiyat theek nahi', 'unwell'],
  ['calls band karo', 'optOut'], ['कॉल मत करो', 'optOut'],
  ['kisi se baat karni hai', 'wantPerson'], ['डॉक्टर से बात करनी है', 'wantPerson'],
  ['woh ghar par nahi hai', 'someoneElse'], ['वो सो रहे हैं', 'someoneElse'],
  ['maine band kar di', 'stopped'], ['ab theek hoon, chhod di', 'stopped'],
  ['khana nahi khaya', 'notEaten'], ['abhi khana nahi khaya', 'notEaten'],
  ['aadha ghanta', 'later', 30], ['bees minute baad', 'later', 20],
  ['nahi li hai', 'notTaken'], ['bhool gaya', 'notTaken'],
  ['le li', 'taken'], ['haan maine tablet kha li', 'taken'],
  ['nahi', 'no'], ['नहीं', 'no'],
  ['haan', 'yes'], ['ji theek hai', 'yes'],
]);
