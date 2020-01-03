// load in the major arcana data, make it available in the global name space
let majorArcanaData = null;
let majorArcanaLoaded = false;
fetch('./data/major_arcana.json')
  .then(d => d.json())
  .then(d => {
    majorArcanaData = d;
    majorArcanaLoaded = true;
  });

const values = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'page',
  'knight',
  'queen',
  'king'
];

const CHARTTYPE_MAP = {
  swords: 'boxplot',
  cups: 'scatterplot',
  pentacles: 'scatterplot',
  wands: 'scatterplot'
};
const chooseRandom = arr => arr[Math.floor(Math.random() * arr.length)];
function emptyMinorArcana(columnTypes) {
  return ['swords', 'wands', 'pentacles', 'cups'].reduce((acc, suit) => {
    const suitOfCards = values.map((value, idx) => {
      return {
        suit,
        cardtitle: `${value.capitalize()} of ${suit.capitalize()}`,
        cardvalue: idx,
        tip: `This is the ${value} of ${suit}`,
        charttype: CHARTTYPE_MAP[suit],
        dims: {
          // xDim will be ignored if not used (e.g. in boxplot)
          xDim: chooseRandom(columnTypes.measure),
          yDim: chooseRandom(columnTypes.measure)
        }
      };
    });

    return acc.concat(suitOfCards);
  }, []);
}

/**
 * Compute the cards in the deck
 * cards have types like
   {
     common to all:
       "cardtitle": string, (our name for the card)
       "tip": string, (the associated tooltip)
       "suit": string (cups, pentacles, wands, swords, "major arcana")

     if major arcana:
       "cardnum": number,
       "tradname": string,
       "image": image name

     if minor arcana:
      "charttype": the chart type to be used, see charts.js
       "dims": {ANY} the necessary information to render teh relevant chart
       "cardvalue": number, the value of the card
   },
 *
 * data - the the data be analyzed by the system
 */
function computeCards(data) {
  const simplerTypeMap = {
    string: 'dimension',
    boolean: 'dimension',
    integer: 'measure',
    number: 'measure'
  };
  const types = dl.type.inferAll(data);
  const groupedTypes = Object.entries(types).reduce(
    (acc, [field, type]) => {
      if (!simplerTypeMap[type]) {
        acc.null.push(field);
        return acc;
      }
      acc[simplerTypeMap[type]].push(field);
      return acc;
    },
    {dimension: [], measure: [], null: []}
  );

  //const deck = majorArcanaData.concat(emptyMinorArcana(groupedTypes));
  // return cards in order,  shuffle later
  // makes sampling easier
  // const deck = emptyMinorArcana();
  // const deck = majorArcanaData;

  /* return shuffle(deck).map((x, idx) => ({
    // eslint appears to not like this line
    ...x,
    pos: idx,
    index: Math.random(),
    // for now reversed is hard to read, so its disabled
    // reversed: Math.random() > 0.5
    reversed: false
  }));
  */

  return {major: majorArcanaData, minor: emptyMinorArcana(groupedTypes)};
}

/**
 * add text to a target query selector
 *
 * queryString - the selector to be queried
 * description - the text to be added
 */
function setDescription(queryString, description) {
  document.querySelector(queryString).innerHTML = description;
}

/**
 * the main method of the application, all subsequent calls should eminante from here
 */
function main() {
  // the state container
  const state = {
    layout: null,
    data: null,
    loading: false,
    cards: []
  };

  // initialize everything
  const mainContainer = d3.select('#main-container');
  const container = document.querySelector('.main-content');

  // update the state of the system based on changed inputs
  function stateUpdate() {
    // if layout and data aren't specified don't do anything
    if (!(state.layout && state.data)) {
      return;
    }
    // compute the cards
    state.cards = computeCards(state.data);

    // remove the placeholder content
    const placeHolder = document.querySelector('#load-msg');
    if (placeHolder) {
      placeHolder.remove();
    }

    // size the mainContainer correctly
    const {height, width} = container.getBoundingClientRect();
    mainContainer.style('height', `${height}px`);
    mainContainer.style('width', `${width}px`);

    // draw the layout
    buildLayout(mainContainer, state.layout, state.cards, state.data);
  }

  // listener for the layout selector
  document
    .querySelector('#layout-selector')
    .addEventListener('change', event => {
      state.layout = event.target.value;
      // update the description text
      setDescription(
        '#layout-description',
        tarotData.layoutAnnotations[state.layout]
      );

      stateUpdate();
    });

  // listener for the data selector
  document
    .querySelector('#dataset-selector')
    .addEventListener('change', event => {
      const datasetName = event.target.value;
      // update the chosen name
      state.loading = true;

      // start loading the data
      d3.csv(`data/${datasetName}`).then(d => {
        state.loading = true;
        state.data = d;
        stateUpdate();
      });
      stateUpdate();
    });

  // listener for reset
  document
    .querySelector('#reset-button')
    .addEventListener('click', stateUpdate);

  // listener for data upload
  document.querySelector('#upload-file').addEventListener('change', event => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      const output = d3.csvParse(event.target.result);
      state.loading = true;
      state.data = output;
      stateUpdate();
    };

    reader.readAsText(file);
  });
  window.onresize = stateUpdate;
}

// start the application after the content has loaded
document.addEventListener('DOMContentLoaded', main);
