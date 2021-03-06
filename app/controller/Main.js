/*eslint angular/no-services: [2,{"directive":["$http","$q"],"controller":["$resource"]}]*/
/*eslint angular/di: [2,"array"]*/
/*eslint max-len: [2,110]*/
/**
 * Main Controller
 */
(function() {
    angular
    .module('SolrHeatmapApp')
    .controller('MainController',
                ['Map', 'HeatMapSourceGenerator', '$http', '$scope',
                    '$rootScope', '$stateParams', 'searchFilter', 'queryService',
        function(Map, HeatMapSourceGenerator, $http, $scope,
                 $rootScope, $stateParams, searchFilter, queryService) {
            var MapService = Map;
            var HeatMapSourceGeneratorService = HeatMapSourceGenerator;

            var vm = this;
            vm.$state = $stateParams;
            vm.setupEvents = function() {
                MapService.getMap().getView()
                  .on('change:resolution', function(evt){
                      var existingHeatMapLayers = MapService.getLayersBy('name', 'HeatMapLayer');
                      if (existingHeatMapLayers &&
                              existingHeatMapLayers.length > 0){
                          var radius = 500 * evt.target.getResolution();
                          var hmLayer = existingHeatMapLayers[0];
                          if (radius > 15) {
                              radius = 15;
                          }
                          hmLayer.setRadius(radius);
                          hmLayer.setBlur(radius*2);
                      }

                      // check box of transform interaction
                      MapService.checkBoxOfTransformInteraction();
                  });
                MapService.getMap().on('moveend', function(evt){
                    searchFilter.setFilter({geo: MapService.getCurrentExtentQuery() });
                    HeatMapSourceGeneratorService.search();
                });

                MapService.getInteractionsByClass(ol.interaction.Transform)[0].on(
                    ['translateend', 'scaleend'], function (e) {
                        searchFilter.setFilter({geo: MapService.getCurrentExtentQuery() });
                        HeatMapSourceGeneratorService.search();
                    });
            };

            vm.response = function(data, status, headers, config) {
                if (data && data.mapConfig) {
                    var mapConf = data.mapConfig,
                        appConf = data.appConfig,
                        bopwsConfig = data.bopwsConfig,
                        instructions = data.instructions;

                    if(solrHeatmapApp.$state.geo) {
                        mapConf.view.extent = queryService.
                          getExtentForProjectionFromQuery(solrHeatmapApp.$state.geo,
                                                          mapConf.view.projection);
                    }
                    MapService.init({
                        mapConfig: mapConf
                    });
                    solrHeatmapApp.appConfig = appConf;
                    solrHeatmapApp.initMapConf = mapConf;
                    solrHeatmapApp.bopwsConfig = bopwsConfig;
                    solrHeatmapApp.instructions = instructions;

                    // fire event mapReady
                    $rootScope.$broadcast('mapReady', MapService.getMap());

                    solrHeatmapApp.setupEvents();
                    /*
                    * register some events
                    */

                // Prepared featureInfo (display number of elements)
                //solrHeatmapApp.map.on('singleclick',
                //                          MapService.displayFeatureInfo);

                } else {
                    throw new Error('Could not find the mapConfig');
                }
            };
            vm.badResponse = function(data, status, headers, config) {
                throw new Error('Error while loading the config.json');
            };

            solrHeatmapApp = vm;

            //  get the app config
            $http.get('./config/appConfig.json')
                .success(solrHeatmapApp.response)
                .error(solrHeatmapApp.badResponse);
        }]
);
})();
