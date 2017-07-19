angular
    .module('ghr.solicitudes', ['ui.bootstrap', 'ang-drag-drop', 'toastr', 'ghr.candidatos', 'ghr.caracteristicas', 'ghr.requisitos', 'ghr.contactos'])
    .component('ghrSolicitudesForm', {
        templateUrl: '../bower_components/component-solicitudes/form.solicitudes.html',
        controller: controladorFormulario
    })
    .component('ghrSolicitudesList', {
        templateUrl: '../bower_components/component-solicitudes/list.solicitudes.html',
        controller: solicitudesListController
    })
    .config(function(toastrConfig) { // Configura los toastr
        angular.extend(toastrConfig, {
            closeButton: true,
            extendedTimeOut: 2000,
            tapToDismiss: true,
            preventOpenDuplicates: true
        });
    })
    .component('ghrSolicitudesDashboard', {
        templateUrl: '../bower_components/component-solicitudes/dashboard.solicitudes.html',
        controller: dashboardSolicitudesController
    })
    .constant('solBaseUrl', 'http://localhost:3003/api/')
    .constant('solEntidad', 'solicitudes')
    .factory('solicitudesFactory', function solicitudesFactory($state, toastr, $http, solBaseUrl, solEntidad, candidatoFactory, caracteristicasFactory, requisitosFactory) {
        var serviceUrl = solBaseUrl + solEntidad;
        return {
            // Read and return all entities
            getAll: function getAll(filter) {
              return $http({
                method: 'GET',
                url: 'http://localhost:3003/api/solicitudes/',
                params: {
                  'filter': filter
                }
              }).then(function onSuccess(response) {
                return response.data;
              }, function onFailure(reason) {
                toastr.error('No se ha podido realizar la operacion, por favor compruebe su conexion a internet e intentelo más tarde.', '¡Error!');
              });
            },
        create: function create(solicitud) {
          return $http({
            method: 'POST',
            url: serviceUrl,
            data: solicitud
          }).then(function onSuccess(response) {
            toastr.success('¡Solicitud creada satisfactoriamente!', '¡Ok!');
            return response.data;
          }, function onFailure(reason) {
            toastr.error('No se ha podido realizar la operacion, por favor compruebe su conexion a internet e intentelo más tarde.', '¡Error!');
          });
        },
        read: function read(id, filter) {
          return $http({
            method: 'GET',
            url: serviceUrl + '/' + id,
            params: {
              'filter': filter
            }
          }).then(function onSuccess(response) {
            return response.data;
          }, function onFailure(reason) {
            toastr.error('No se ha podido realizar la operacion, por favor compruebe su conexion a internet e intentelo más tarde.', '¡Error!');
          });
        },
        update: function update(id, solicitud) {
          return $http({
            method: 'PATCH',
            url: 'http://localhost:3003/api/solicitudes/' + id,
            data: solicitud
          }).then(function onSuccess(response) {
            toastr.success('¡Solicitud modificada satisfactoriamente!', '¡Ok!');
            return response.data;
          }, function onFailure(reason) {
            toastr.error('No se ha podido realizar la operacion, por favor compruebe su conexion a internet e intentelo más tarde.', '¡Error!');
          });
        },
        delete: function _delete(id) {
          if (!id) {
            throw solEntidad + 'invalida.';
          }
          return $http({
            method: 'DELETE',
            url: serviceUrl + '/' + id
          }).then(function onSuccess(response) {
            toastr.success('¡Solicitud eliminada satisfactoriamente!', '¡Ok!');
            return response.data;
          }, function onFailure(reason) {
            toastr.error('No se ha podido realizar la operacion, por favor compruebe su conexion a internet e intentelo más tarde.', '¡Error!');
          });
        },
            // Devuelve el candidato seleccionado de la solicitud
        getCandidato: function getCandidato(id) {
          return $http({
            method: 'GET',
            url: serviceUrl + '/' + id + '/candidato'
          }).then(function onSuccess(response) {
            return response.data;
          }, function onFailure(reason) {
            toastr.error('No se ha podido realizar la operacion, por favor compruebe su conexion a internet e intentelo más tarde.', '¡Error!');
          });
        }
      };
    });
// Controller para generar nuestras solicitudes y gestionar el borrado de la solicitud
function solicitudesListController($uibModal, $log, solicitudesFactory, $filter, toastr) {
    const vm = this;

    function actualizarArraySolicitudes() {
        vm.arrayFiltrado = $filter('filter')(vm.arraySolicitudes, vm.filtro);
    }
    vm.actualizarArraySolicitudes = actualizarArraySolicitudes;
    solicitudesFactory.getAll().then(
        function onSuccess(response) {
            vm.arraySolicitudes = response;
            vm.arrayFiltrado = vm.arraySolicitudes;
            vm.totalItems = vm.arraySolicitudes.length;
        });
    // vm.arraySolicitudes = solicitudesFactory.getAll();
    vm.maxSize = 10; // Numero maximo de elementos
    vm.currentPage = 1;

    // Se encarga de abrir nuestra ventana modal en base al id obtenido
    vm.openComponentModal = function(id) {
        var modalInstance = $uibModal.open({
            component: 'modalComponentBorrarSolicitudes',
            resolve: {
                seleccionado: function() {
                    return id;
                }
            }
        });
        // Instance para borrar una entidad concreta de solicitudes
        modalInstance.result.then(function(solicitudId) {
            solicitudesFactory.delete(solicitudId).then(function onSuccess(deletedCount) {
                solicitudesFactory.getAll().then(function(solicitudes) {
                    vm.arraySolicitudes = solicitudes;
                    actualizarArraySolicitudes();
                });
            });
        }, function(reason) {});
    };
}
// Controller que se encarga de gestionar nuestro formulario de solicitudes
function controladorFormulario(toastr, solicitudesFactory, candidatoFactory, caracteristicasFactory, requisitosFactory, $stateParams, $log, $state) {
    const vm = this;
    vm.mode = $stateParams.mode;
    vm.estados = ['abierta', 'cerradaCliente', 'cerradaIncorporacion', 'standby'];

    vm.comprobarForm = function(op) {
        if (op == 'S') {
            return 'Si';
        } else if (op == 'N') {
            return 'No';
        }
    };

    /**
     * Cambia al modo entre view y edit
     * @return {[type]} [description]
     */
    vm.changeMode = function() {
        var modo;
        if ($stateParams.mode == 'view') {
            modo = 'editar';
        } else {
            modo = 'view';
        }
        $state.go($state.current, {
            mode: modo
        });
        vm.mode = $stateParams.mode;
    };

    /**
     * Crea una copia de la solicitud en un nuevo objeto para
     * ser recuperado en caso de descartar cambios
     * @return {[type]} [description]
     */
    vm.setOriginal = function(data) {
        vm.original = angular.copy(vm.solicitud = vm.formatearFecha(data));
    };

    /**
     * Descartar cambios
     * @return {[type]} [description]
     */
    vm.reset = function() {
        vm.solicitud = angular.copy(vm.original);
    };
    vm.reset();


    /**
     * Devuelve el candidato seleccionado de la solicitud
     * @return {[type]} [description]
     */
     vm.getCandidatoSeleccionado = function() {
         filter = {
             "include": {
                 "candidato": {
                     "listaDeRequisito": "requisitos"
                 }
             }
         }
         solicitudesFactory.read($stateParams.id, filter)
             .then(function onSuccess(response) {
                 var points = 0;
                 angular.forEach(response.candidato.listaDeRequisito.requisitos, function(req) {
                     points += req.nivel;
                 })
                 vm.candidatoSeleccionado = response.candidato
                 vm.candidatoSeleccionado.points = points;
             });
     };

    /**
     * Setea el candidato seleccionado de la solicitud
     * @return {[type]} [description]
     */
    vm.setCandidatoSelect = function setCandidatoSelect(id) {
        var idCandidato = null;
        if (id !== null) {
            idCandidato = id;
        }
        var solicitudMod = {
            candidatoId: idCandidato
        };
        solicitudesFactory.update($stateParams.id, solicitudMod)
            .then(function(response) {
                vm.solicitud = angular.copy(vm.solicitud);
            }).then(function() {
                vm.getSolicitud();
            });
    };

    /**
     * Lee la solicitud pasada por el $stateParams
     * @return {[type]} [description]
     */
     vm.getListaRequisitos = function (solicitudCompleta) {
       vm.listaRequisitosObligatorios = [];
       vm.listaRequisitosDeseados = [];
       console.log(solicitudCompleta);
       for (var i = 0; i < solicitudCompleta.reqObligatorios.requisitos.length; i++) {
         vm.listaRequisitosObligatorios[i] = solicitudCompleta.reqObligatorios.requisitos[i];
       }
       for (var i = 0; i < solicitudCompleta.reqDeseables.requisitos.length; i++) {
         vm.listaRequisitosDeseados[i] = solicitudCompleta.reqDeseables.requisitos[i];
       }
       console.log(vm.listaRequisitosDeseados);
       console.log(vm.listaRequisitosObligatorios);
     }

    vm.getSolicitud = function() {
        var filtro = {
          "include": [
            {"reqObligatorios": {
              "requisitos": "caracteristica"
            }
          },
          {"reqDeseables": {
            "requisitos": "caracteristica"
          }
        },
        "candidato"
        ]
      };
        return solicitudesFactory.read($stateParams.id, filtro)
            .then(function addReqObl(solicitud) {
                vm.solicitud = angular.copy(vm.original = vm.formatearFecha(solicitud));
                if (vm.solicitud.candidatoId) {
                    vm.getCandidatoSeleccionado(vm.solicitud.candidatoId);
                } else {
                    vm.candidatoSeleccionado = {
                        nombre: 'No hay candidato seleccionado',
                        id: null
                    }
                }
                vm.getListaRequisitos(vm.solicitud);
                return vm.reqObligatorios = requisitosFactory.read(vm.original.idReqObligatorios);
            })
            .then(function addReqDes(response) {
                vm.reqObligatorios = response;
                return vm.reqDeseables = requisitosFactory.read(vm.original.idReqDeseables);
            })
            .then(function(reqObl) {
                vm.reqDeseables = reqObl;
                var arrayIdsCaracteristicas = [];
                angular.forEach(vm.reqObligatorios, function(requisito) {
                    arrayIdsCaracteristicas.push(requisito.caracteristicaId);
                })
                var filter = {
                    "fields": {
                        "nombre": true,
                        "apellido": true,
                        "id": true,
                        "listaDeRequisitoId": true
                    },
                    "include": {
                        "listaDeRequisito": {
                            "relation": "requisitos",
                            "scope": {
                                "where": {
                                    "caracteristicaId": {
                                        "inq": arrayIdsCaracteristicas
                                    }
                                }
                            }
                        }
                    }
                }

                return candidatoFactory.getAll(filter);
            })
            .then(function(response) {
                vm.candidatos = response.filter(function(candidato) {
                    if (candidato.listaDeRequisito != undefined && candidato.listaDeRequisito.requisitos.length) {
                        var points = 0;
                        angular.forEach(candidato.listaDeRequisito.requisitos, function(requisito) {
                            points += requisito.nivel
                        })
                        candidato.points = points;
                        if (vm.solicitud.candidatoId) {
                            return candidato.listaDeRequisito.requisitos.length >= vm.reqObligatorios.length && candidato.id != vm.candidatoSeleccionado.id
                        } else {
                            return candidato.listaDeRequisito.requisitos.length >= vm.reqObligatorios.length
                        }

                    } else {
                        return false;
                    }
                });
            });
    };

    // Lee la solicitud, el candidato seleccionado y los candidatos recomendados
    if ($stateParams.id != 0) {
        vm.getSolicitud();
    }
    /**
     * Formata la fecha de la solicitud para que sea compatible con la vista
     * @param  {[type]} response [description]
     * @return {[type]}          [description]
     */
    vm.formatearFecha = function formatearFecha(response) {
        response.fechaRecibida = new Date(response.fechaRecibida);
        return response;
    };

    /**
     * Crea o actualiza una solicitud
     * @param  {[type]} solicitud [description]
     * @param  {[type]} form      [description]
     * @return {[type]}           [description]
     */
    vm.updateOrCreate = function(solicitud, form) {
        if (form.$valid) {
            // Create
            if ($stateParams.id == 0) {
                delete vm.solicitud.id;
                solicitudesFactory.create(vm.solicitud).then(
                    function(solicitud) {
                        $state.go($state.current, {
                            id: solicitud.id
                        });
                    });
            }
            // Update
            else {
                var solicitudMod = {};
                for (var i = 0; i < form.$$controls.length; i++) {
                    var input = form.$$controls[i];
                    if (input.$dirty) {
                        solicitudMod[input.$name] = input.$modelValue;
                    }
                }
                console.log(solicitudMod);
                if (form.$dirty) {
                    solicitudesFactory.update(solicitud.id, solicitudMod).then(
                        function onSuccess(response) {
                            vm.setOriginal(response);
                        }
                    );
                } else {
                    toastr.info('No hay nada que modificar', 'Info');
                }
            }
        } else {
            toastr.warning('¡Debe rellenar los campos obligatorios!', '¡Cuidado!');
        }
    };

    // Paginación de los candidatos recomendados
    vm.maxSize = 5; // Numero maximo de elementos
    vm.currentPage = 1;
}
// Controlador ModalInstanceCtrl para confirmar y cancelar nuestra peticion
angular
    .module('ghr.solicitudes')
    .controller('ModalInstanceCtrl', function($uibModalInstance, $log) {
        var $ctrl = this;
        vm.ok = function(value) {
            $uibModalInstance.close(value);
        };
        vm.cancel = function(reason) {
            $uibModalInstance.dismiss(reason);
        };
    });
// Modulo para nuestra ventana modal con su controller para eliminar y cancelar
angular.module('ghr.solicitudes')
.component('modalComponentBorrarSolicitudes', {
  templateUrl: '../bower_components/component-solicitudes/myModalContent.html',
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&'
  },
  controller: function (toastr, solicitudesFactory) {
    var vm = this;
    vm.arraySolicitudes = solicitudesFactory.getAll();
    vm.$onInit = function () {
      vm.seleccionado = vm.resolve.seleccionado;
    };
    vm.eliminar = function (solicitud) {
      vm.close({
        $value: solicitud
      });
    };
    vm.cancelar = function () {
      vm.dismiss({
        $value: 'cancel'
      });
    };
  }
})
.component('modalComponentEstadoSolicitudes', {
  templateUrl: '../bower_components/component-solicitudes/myModalEstado.html',
  controller: dashboardSolicitudesController,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&'
  }
});

function dashboardSolicitudesController(toastr, $uibModal, solicitudesFactory, $filter, candidatoFactory, contactosFactory) {
  var vm = this;

  var filter = {
   "include":{
      "relation":"candidato",
      "scope":{
         "fields":[
            "id",
            "nombre",
            "apellido",
            "perfil",
            "posicion"
         ],
         "include":{
            "relation":"contactos"
         }
      }
   },
   "fields":{
      "brm":false,
      "adm":false,
      "consultorasContactadas":false,
      "fechaCierre":false
   }
};

  //Metodos dragAndDrop
  vm.dropSuccessHandler = function ($event, index, array, $data) {
    array.splice(index, 1);
  };

  // vm.dropValidate = function(target, source) {
  //       return target !== source;
  // };

  vm.dropValidate = function($data,estado){
      console.log($data.estado + " el estado enviado es" + estado)
      return $data.estado !== estado;
  }
  vm.onDrop = function ($event, $data, array, estado) {
    //if(vm.dropValidate()) {
    // if(vm.dropValidate($data,estado)) {
      if(estado == "cerrada") {
        vm.openComponentModalEstado($data);
        array.unshift($data);
      }
      else{
        if($data.estado == estado){
          toastr.info('¡Esta modificando una solicitud en el mismo estado!', '¡Cuidado!')
        }else{
          $data.estado = estado;
          solicitudesFactory.update($data.id, $data).then(function onSuccess() {
            solicitudesFactory.getAll().then(function (solicitudes) {
              //vm.arrayFiltrado = solicitudes;
              array.unshift($data);
            });
          });
          //array.unshift($data);
        }

      }
    //}
    //}
  };


  //Recogemos las solicitudes con sus candidatos y contactos correspondientes
  solicitudesFactory.getAll(filter).then(function (res2) {
      vm.arraySolicitudes = [];
      vm.arraySolicitudes = res2;
      vm.arrayFiltrado = vm.arraySolicitudes;
    });
    vm.arrayFiltrado = vm.arraySolicitudes;

    //Metodos para controlar la ventana Modal
    vm.$onInit = function () {
      vm.seleccionado = vm.resolve.seleccionado;
    };
    vm.cambiarEstado = function (solicitud) {
      vm.close({
        $value: solicitud
      });
    };
    vm.cancelar = function () {
      vm.dismiss({
        $value: 'cancel'
      });
    };

// Se encarga de abrir nuestra ventana modal en base al id obtenido
vm.openComponentModalEstado = function (solicitud) {
  var modalInstance = $uibModal.open({
    component: 'modalComponentEstadoSolicitudes',
    resolve: {
      seleccionado: function () {
        return solicitud;
      }
    }
  });
  // Instance para modificar una entidad concreta de solicitudes
  modalInstance.result.then(function (solicitud) {
    console.log('modalInstance: ',solicitud);
    solicitudesFactory.update(solicitud.id, solicitud).then(function onSuccess() {
      solicitudesFactory.getAll().then(function (solicitudes) {
        vm.arraySolicitudes = solicitudes;
      });
    });
  }, function (reason) {});
};
}
