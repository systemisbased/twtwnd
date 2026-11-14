import {load} from './settings.js';
import {initGame,startLoop} from './game.js';
import {initUI} from './ui.js';
load();initGame(document.getElementById('cv'));initUI();startLoop();
