'use strict';

var _ = require('lodash');

module.exports = function (PortCall) {
  /**
   * Returns Routes grouped by RouteId
   */
  var getGroupByRoutes = function (routes) {
    return _.groupBy(routes, function (record) {
      return record.routeId;
    });
  };

  /**
   * This function returns all possible direct voyages of all Routes
   * @param routes <Array> 
   */
  var getAllRoutes = function (routes, groupByRoutes) {
    var voyages = [];
    var i;

    /**
     * Returns the possible voyages of particular route
     * @param  route <Array>
     */
    var getPossibleVoyagesByRoute = function (route) {
      var i, voyages = [];
      _.each(route, function (record, index) {
        index = parseInt(index);
        for (i = index + 1; i < route.length; i++) {
          if (route[i].port === record.port) {
            continue;
          }
          voyages.push({
            vessel: record.vessel,
            routeId: record.routeId,
            departurePort: record.port,
            arrivalPort: route[i].port,
            departureDate: record.etd,
            arrivalDate: route[i].eta,
            hasTransShipment: false
          });
        }
      });

      return voyages;
    };

    for (i in groupByRoutes) {
      voyages = _.concat(voyages, getPossibleVoyagesByRoute(groupByRoutes[i]));
    }


    return voyages;
  };

  /**
   * Returns all possible transhipments voyages
   * @param  voyages <Array> 
   */
  var getRoutesWithTransShipments = function (routes, groupByRoutes) {
    var voyages = [];
    var i,
      index = 0;
    // var groupByRoutesArray=_.values(groupByRoutes);

    var getPossibleTransShipments = function (route, index) {
      var remainingRoutes = _.chain(groupByRoutes).omit(index).values().value();

      var i,
        isInterchangeAvailable = false,
        position,
        isDateFeasible = false,
        sourcePort,
        interchangePort,
        transShipments = [];

      var addToTranshipments = function (record) {
        if (sourcePort.port !== record.port) {
          transShipments.push({
            vessel: [sourcePort.vessel, record.vessel].join(' => '),
            routeId: [sourcePort.routeId, record.routeId],
            departurePort: sourcePort.port,
            arrivalPort: record.port,
            departureDate: sourcePort.etd,
            arrivalDate: record.eta,
            hasTransShipment: true
          });
        }
      };

      for (i = 0; i < remainingRoutes.length; i++) {
        //assumption interchange can only happen from start point
        interchangePort = remainingRoutes[i][0];
        position = _.map(route, 'port').indexOf(interchangePort.port);
        isInterchangeAvailable = position === -1 ? false : true;
        if (isInterchangeAvailable) {
          sourcePort = route[position];
          isDateFeasible = Date.parse(sourcePort.etd) <
            Date.parse(interchangePort.etd);
        }
        if (isInterchangeAvailable && isDateFeasible) {
          _.each(remainingRoutes[i], addToTranshipments);
        }
      }

      return transShipments;

    };

    for (i in groupByRoutes) {
      voyages = _.concat(voyages, getPossibleTransShipments(groupByRoutes[i], i));
    }
    return voyages;
  };

  PortCall.getRoutes = function (etd, eta, cb) {
    // For more information on how to query data in loopback please see
    // https://docs.strongloop.com/display/public/LB/Querying+data
    const query = {
      where: {
        and: [
          { // port call etd >= etd param, or can be null
            or: [{ etd: { gte: etd } }, { etd: null }]
          },
          { // port call eta <= eta param, or can be null
            or: [{ eta: { lte: eta } }, { eta: null }]
          }
        ]
      }
    };

    PortCall.find(query)
      .then(calls => {
        // TODO: convert port calls to voyages/routes
        var groupByRoutes = getGroupByRoutes(calls);
        var voyages = getAllRoutes(calls, groupByRoutes);
        var transShipments = getRoutesWithTransShipments(calls, groupByRoutes);

        return cb(null, _.concat(voyages, transShipments));
      })
      .catch(err => {
        console.log(err);

        return cb(err);
      });
  };

  PortCall.remoteMethod('getRoutes', {
    accepts: [
      { arg: 'etd', 'type': 'date' },
      { arg: 'eta', 'type': 'date' }
    ],
    returns: [
      { arg: 'routes', type: 'array', root: true }
    ]
  });

};
