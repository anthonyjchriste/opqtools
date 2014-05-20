var iticPlotter = (function() {
  // Private API
  var plot;

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
  function init(plotDiv) {
    plot = $.plot($(plotDiv), [topCurve, bottomCurve], plotOptions);
  }

  return {
    init: init
  };
})();
