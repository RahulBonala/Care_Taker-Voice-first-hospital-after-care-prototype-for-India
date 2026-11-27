'use strict';
require('./helpers').intentSuite('ta', [
  ['தலை சுற்றுது', 'unwell'], ['udambu sariyilla', 'unwell'],
  ['கால் பண்ணாதீங்க', 'optOut'], ['call pannatheenga', 'optOut'],
  ['நர்ஸ் கிட்ட பேசணும்', 'wantPerson'], ['doctor kitta pesanum', 'wantPerson'],
  ['அவங்க வீட்டில் இல்லை', 'someoneElse'], ['amma veetla illa', 'someoneElse'],
  ['நிறுத்திட்டேன்', 'stopped'], ['naan niruthitten', 'stopped'],
  ['இன்னும் சாப்பிடல', 'notEaten'], ['saapidala', 'notEaten'],
  ['அரை மணி அப்புறம்', 'later', 30], ['20 nimisham apram', 'later', 20],
  ['இன்னும் எடுக்கல', 'notTaken'], ['maranthutten', 'notTaken'],
  ['எடுத்துட்டேன்', 'taken'], ['tablet pottuten', 'taken'],
  ['இல்லை', 'no'], ['illa', 'no'],
  ['ஆமாம்', 'yes'], ['sari', 'yes'],
]);
