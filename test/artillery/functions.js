
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

module.exports = {
  setMessage: setMessage,
  getUuid: uuidv4
};

const MESSAGES = [
  'ça va ?',
  'Qu\'est ce que la PLS ?',
  'A quoi sert le portail RH ?',
  'A quoi sert le VAE ?',
  'Comment accéder à Eureka ?',
  'Combien y-a-t\'il de référents mixité ?',
  'Comment déclarer une grossesse ?',
  'Comment contacter le CPO ?',
  'Comment faire une demande de relogement ?',
  'Truc qui veut rien dire pour choper la phrase quand le chatbot sait pas quoi répondre :o'
];

function setMessage(context, events, done) {
  // pick a message randomly
  const index = Math.floor(Math.random() * MESSAGES.length);
  // make it available to templates as "message"
  context.vars.message = MESSAGES[index];
  return done();
}

function uuidv4() {
  return 'xxxxxxxx-xxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
