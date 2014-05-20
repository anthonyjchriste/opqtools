var iticPlotter = (function() {
  // Private API
  var plot;

  var Region = Object.freeze({
    NO_INTERRUPTION: "No Interruption",
    NO_DAMAGE: "No Damage",
    PROHIBITED: "Prohibited"
  });

  /**
   * Data series representing PQ events.
   */
  var eventPoints = {
    points: {
      show: true
    },
    lines: {
      show: false
    },
    data: []
  };

  /**
   * Top data series of ITIC curve.
   */
  var topCurve = {
    color: "#FF0000",
    data: [[0.1667, 500],
      [1, 200],
      [3, 140],
      [3, 120],
      [500, 120],
      [500, 110],
      [100001, 110]]
  };

  /**
   * Bottom data series of ITIC curve.
   */
  var bottomCurve = {
    color: "#FF0000",
    data: [[20, 0],
      [20, 70],
      [500, 70],
      [500, 80],
      [10000, 80],
      [10000, 90],
      [100000, 90],
      [100001, 90]
    ]};

  var plotOptions = {
    xaxis: {
      min: 0.01,
      transform: function(v){return Math.log(v);},
      inverseTransform: function(v){return Math.exp(v);}
    },
    yaxis: {
      max: 500
    },
    xaxes: [{
      axisLabel: "Duration in milliseconds"
    }],
    yaxes: [{
      axisLabel: "% Nominal Voltage"
    }]

  };

  // Public API
  /**
   * Creates an empty ITIC plot using the passed in div.
   * @param div Div to create an empty ITIC plot out of.
   */
  function init(div) {
    plot = $.plot($(div), [topCurve, bottomCurve, eventPoints], plotOptions);
  }

  /**
   * Adds an event to the ITIC plot.
   * @param duration The duration of the event.
   * @param percentNominalVoltage The % nominal voltage of the event.
   */
  function addPoint(duration, percentNominalVoltage) {
    eventPoints["data"].push([duration, percentNominalVoltage]);
  }

  /**
   * Adds a list of events to the ITIC plot.
   * @param points An array of points where each point is an array consisting of a duration and % nominal voltage.
   */
  function addPoints(points) {
    for(var i = 0; i < points.length; i++) {
      eventPoints["data"].push(points[i]);
    }
  }

  /**
   * Removes event points from the ITIC plot.
   */
  function removePoints() {
    while(eventPoints["data"].length > 0) {
      eventPoints["data"].pop();
    }
  }

  /**
   * Redraw the ITIC plot with the current set of event points.
   */
  function update() {
    plot.setData([topCurve, bottomCurve, eventPoints]);
    plot.draw();
  }

  function getRegionOfPoint(duration, percentNomincalVoltage) {
    // TODO
  }

  return {
    init: init,
    addPoint: addPoint,
    addPoints: addPoints,
    removePoints: removePoints,
    update: update
  };
})();
