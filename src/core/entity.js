
var Mura=require('./core');

/**
* Creates a new Mura.Entity
* @name  Mura.Entity
* @class
* @extends Mura.Core
* @memberof Mura
* @param  {object} properties Object containing values to set into object
* @return {Mura.Entity}
*/

Mura.Entity = Mura.Core.extend(
/** @lends Mura.Entity.prototype */
{
    init: function(properties,requestcontext) {
        properties = properties || {};
        properties.entityname = properties.entityname ||
            'content';
        properties.siteid = properties.siteid || Mura.siteid;
        this.set(properties);

        if (typeof this.properties.isnew == 'undefined') {
            this.properties.isnew = 1;
        }

        if (this.properties.isnew) {
            this.set('isdirty', true);
        } else {
            this.set('isdirty', false);
        }

        if (typeof this.properties.isdeleted ==
            'undefined') {
            this.properties.isdeleted = false;
        }

        this._requestcontext=requestcontext || Mura._requestcontext;

        this.cachePut();

        return this;
    },

    /**
		 * setRequestContext - Sets the RequestContext
		 *
		 * @RequestContext  {Mura.RequestContext} Mura.RequestContext List of fields
		 * @return {Mura.Feed}        Self
		 */
		setRequestContext: function(requestcontext) {
			this._requestcontext=requestcontext;
			return this;
		},

    /**
     * exists - Returns if the entity was previously saved
     *
     * @return {boolean}
     */
    exists: function() {
        return this.has('isnew') && !this.get('isnew');
    },



    /**
     * get - Retrieves property value from entity
     *
     * @param  {string} propertyName Property Name
     * @param  {*} defaultValue Default Value
     * @return {*}              Property Value
     */
    get: function(propertyName, defaultValue) {
        if (typeof this.properties.links != 'undefined' &&
            typeof this.properties.links[propertyName] !=
            'undefined') {
            var self = this;

            if (typeof this.properties[propertyName] == 'object') {

                return new Promise(function(resolve,reject) {
                    if ('items' in self.properties[propertyName]) {
                        var returnObj = new Mura.EntityCollection(self.properties[propertyName],self._requestcontext);

                    } else {
                        if (Mura.entities[self.properties[propertyName].entityname]) {
                            var returnObj = new Mura.entities[self.properties[propertyName ].entityname](self.properties[propertyName],self._requestcontext);
                        } else {
                            var returnObj = new Mura.Entity(self.properties[propertyName],self._requestcontext);
                        }
                    }

                    if (typeof resolve == 'function') {
                        resolve(returnObj);
                    }
                });

            } else {
                if (typeof defaultValue == 'object') {
                    var params = defaultValue;
                } else {
                    var params = {};
                }
                return new Promise(function(resolve,
                    reject) {

                    self._requestcontext.request({
                        type: 'get',
                        url: self.properties.links[propertyName],
                        params: params,
                        success: function(resp) {

                            if (
                                'items' in resp.data
                            ) {
                                var returnObj = new Mura.EntityCollection(resp.data,self._requestcontext);
                            } else {
                                if (
                                    Mura.entities[self.entityname]
                                ) {
                                    var returnObj = new Mura.entities[self.entityname](resp.data,self._requestcontext);
                                } else {
                                    var returnObj = new Mura.Entity(resp.data,self._requestcontext);
                                }
                            }

                            //Dont cache it there are custom params
                            if (
                                Mura.isEmptyObject(params)) {
                                self.set(propertyName,resp.data);
                            }

                            if (
                                typeof resolve == 'function'
                            ) {
                                resolve(returnObj);
                            }
                        },
                        error: reject
                    });
                });
            }

        } else if (typeof this.properties[propertyName] !=
            'undefined') {
            return this.properties[propertyName];
        } else if (typeof defaultValue != 'undefined') {
            this.properties[propertyName] =
                defaultValue;
            return this.properties[propertyName];

        } else {
            return '';
        }
    },


    /**
     * set - Sets property value
     *
     * @param  {string} propertyName  Property Name
     * @param  {*} propertyValue Property Value
     * @return {Mura.Entity} Self
     */
    set: function(propertyName, propertyValue) {

        if (typeof propertyName == 'object') {
            this.properties = Mura.deepExtend(this.properties,
                propertyName);
            this.set('isdirty', true);
        } else if (typeof this.properties[propertyName] ==
            'undefined' || this.properties[propertyName] !=
            propertyValue) {
            this.properties[propertyName] =
                propertyValue;
            this.set('isdirty', true);
        }

        return this;

    },


    /**
     * has - Returns is the entity has a certain property within it
     *
     * @param  {string} propertyName Property Name
     * @return {type}
     */
    has: function(propertyName) {
        return typeof this.properties[propertyName] !=
            'undefined' || (typeof this.properties.links !=
                'undefined' && typeof this.properties.links[
                    propertyName] != 'undefined');
    },


    /**
     * getAll - Returns all of the entities properties
     *
     * @return {object}
     */
    getAll: function() {
        return this.properties;
    },


    /**
     * load - Loads entity from JSON API
     *
     * @return {Promise}
     */
    load: function() {
        return this.loadBy('id', this.get('id'));
    },


    /**
     * new - Loads properties of a new instance from JSON API
     *
     * @param  {type} params Property values that you would like your new entity to have
     * @return {Promise}
     */
    'new': function(params) {
        var self = this;

        return new Promise(function(resolve, reject) {
            params = Mura.extend({
                    entityname: self.get('entityname'),
                    method: 'findNew',
                    siteid: self.get('siteid'),
                    '_cacheid': Math.random()
                },
                params
            );

            Mura.get(Mura.apiEndpoint, params).then(
                function(resp) {
                    self.set(resp.data);
                    if (typeof resolve == 'function') {
                        resolve(self);
                    }
                });
        });
    },

    /**
     * checkSchema - Checks the schema for Mura ORM entities
     *
     * @return {Promise}
     */
    'checkSchema': function() {
        var self = this;

        return new Promise(function(resolve, reject) {
          if(Mura.mode.toLowerCase() == 'rest'){
            self._requestcontext.request({
                type: 'post',
                url: Mura.apiEndpoint,
                data:{
                      entityname: self.get('entityname'),
                      method: 'checkSchema',
                      siteid: self.get('siteid'),
                      '_cacheid': Math.random()
                  },
                success: function(  resp) {
                    if (resp.data != 'undefined'  ) {
                        if (typeof resolve ==  'function') {
                            resolve(self);
                        }
                    } else {
                        self.set('errors',resp.error);
                        if (
                            typeof reject == 'function'
                        ) {
                            reject(self);
                        }
                    }
                }
            });
          } else {
            self._requestcontext.request({
                type: 'post',
                url: Mura.apiEndpoint + '?method=generateCSRFTokens',
                data: {
                    siteid: self.get('siteid'),
                    context: ''
                },
                success: function(resp) {
                    self._requestcontext.request({
                        type: 'post',
                        url: Mura.apiEndpoint,
                        data: Mura
                            .extend(  {
                                    entityname: self.get('entityname'),
                                    method: 'checkSchema',
                                    siteid: self.get('siteid'),
                                    '_cacheid': Math.random()
                                }, {
                                    'csrf_token': resp.data.csrf_token,
                                    'csrf_token_expires': resp.data.csrf_token_expires
                                }
                            ),
                        success: function(  resp) {
                            if (resp.data != 'undefined'  ) {
                                if (typeof resolve ==  'function') {
                                    resolve(self);
                                }
                            } else {
                                self.set('errors',resp.error);
                                if (
                                    typeof reject == 'function'
                                ) {
                                    reject(self);
                                }
                            }
                        }
                    });
                },
                error: function(resp) {
                    this.success(resp );
                }
            });
          }
        });

    },

    /**
     * undeclareEntity - Undeclares an Mura ORM entity with service factory
     *
     * @return {Promise}
     */
    'undeclareEntity': function(deleteSchema) {
				deleteSchema=deleteSchema || false;
        var self = this;

        return new Promise(function(resolve, reject) {
          if(Mura.mode.toLowerCase() == 'rest'){
            self._requestcontext.request({
                type: 'post',
                url: Mura.apiEndpoint,
                data: {
                        entityname: self.get('entityname'),
												deleteSchema: deleteSchema,
                        method: 'undeclareEntity',
                        siteid: self.get('siteid'),
                        '_cacheid': Math.random()
                      },
                success: function(  resp) {
                    if (resp.data != 'undefined'  ) {
                        if (typeof resolve ==  'function') {
                            resolve(self);
                        }
                    } else {
                        self.set('errors',resp.error);
                        if (
                            typeof reject == 'function'
                        ) {
                            reject(self);
                        }
                    }
                }
            });
          } else {
            return self._requestcontext.request({
                type: 'post',
                url: Mura.apiEndpoint + '?method=generateCSRFTokens',
                data: {
                    siteid: self.get('siteid'),
                    context: ''
                },
                success: function(resp) {
                    self._requestcontext.request({
                        type: 'post',
                        url: Mura.apiEndpoint,
                        data: Mura
                            .extend(  {
                                    entityname: self.get('entityname'),
                                    method: 'undeclareEntity',
                                    siteid: self.get('siteid'),
                                    '_cacheid': Math.random()
                                }, {
                                    'csrf_token': resp.data.csrf_token,
                                    'csrf_token_expires': resp.data.csrf_token_expires
                                }
                            ),
                        success: function(  resp) {
                            if (resp.data != 'undefined'  ) {
                                if (typeof resolve ==  'function') {
                                    resolve(self);
                                }
                            } else {
                                self.set('errors',resp.error);
                                if (
                                    typeof reject == 'function'
                                ) {
                                    reject(self);
                                }
                            }
                        }
                    });
                },
                error: function(resp) {
                    this.success(resp );
                }
            });
          }
        });

    },


    /**
     * loadBy - Loads entity by property and value
     *
     * @param  {string} propertyName  The primary load property to filter against
     * @param  {string|number} propertyValue The value to match the propert against
     * @param  {object} params        Addition parameters
     * @return {Promise}
     */
    loadBy: function(propertyName, propertyValue, params) {

        propertyName = propertyName || 'id';
        propertyValue = propertyValue || this.get(propertyName) || 'null';

        var self = this;

        if (propertyName == 'id') {
            var cachedValue = Mura.datacache.get(propertyValue);

            if (typeof cachedValue != 'undefined') {
                this.set(cachedValue);
                return new Promise(function(resolve,reject) {
                    resolve(self);
                });
            }
        }

        return new Promise(function(resolve, reject) {
            params = Mura.extend({
                    entityname: self.get('entityname').toLowerCase(),
                    method: 'findQuery',
                    siteid: self.get( 'siteid'),
                    '_cacheid': Math.random(),
                },
                params
            );

            if (params.entityname == 'content' ||  params.entityname ==  'contentnav') {
                params.includeHomePage = 1;
                params.showNavOnly = 0;
                params.showExcludeSearch = 1;
            }

            params[propertyName] = propertyValue;

            Mura.findQuery(params).then(
                function(collection) {
                    if (collection.get('items').length) {
                        self.set(collection.get('items')[0].getAll());
                    }

                    if (typeof resolve == 'function') {
                        resolve(self);
                    }
                });
        });
    },


    /**
     * validate - Validates instance
     *
     * @param  {string} fields List of properties to validate, defaults to all
     * @return {Promise}
     */
    validate: function(fields) {
        fields = fields || '';

        var self = this;
        var data = Mura.deepExtend({}, self.getAll());

        data.fields = fields;

        return new Promise(function(resolve, reject) {

            self._requestcontext.request({
                type: 'post',
                url: Mura.apiEndpoint +
                    '?method=validate',
                data: {
                    data: Mura.escape( data),
                    validations: '{}',
                    version: 4
                },
                success: function(resp) {
                    if (resp.data !=
                        'undefined'
                    ) {
                        self.set('errors',resp.data )
                    } else {
                        self.set('errors', resp.error
                        );
                    }

                    if (typeof resolve ==  'function') {
                        resolve(self);
                    }
                }
            });
        });

    },


    /**
     * hasErrors - Returns if the entity has any errors
     *
     * @return {boolean}
     */
    hasErrors: function() {
        var errors = this.get('errors', {});
        return (typeof errors == 'string' && errors !=
            '') || (typeof errors == 'object' && !
            Mura.isEmptyObject(errors));
    },


    /**
     * getErrors - Returns entites errors property
     *
     * @return {object}
     */
    getErrors: function() {
        return this.get('errors', {});
    },


    /**
     * save - Saves entity to JSON API
     *
     * @return {Promise}
     */
    save: function() {
        var self = this;

        if (!this.get('isdirty')) {
            return new Promise(function(resolve, reject) {
                if (typeof resolve ==
                    'function') {
                    resolve(self);
                }
            });
        }

        if (!this.get('id')) {
            return new Promise(function(resolve, reject) {
                var temp = Mura.deepExtend({},
                    self.getAll());

                self._requestcontext.request({
                    type: 'get',
                    url: Mura.apiEndpoint + self.get('entityname') + '/new',
                    success: function(resp) {
                        self.set(resp.data);
                        self.set(temp);
                        self.set('id',resp.data.id);
                        self.set('isdirty',true);
                        self.cachePut();
                        self.save().then(
                                resolve,
                                reject
                            );
                    }
                });
            });

        } else {
            return new Promise(function(resolve, reject) {

                var context = self.get('id');
                if(Mura.mode.toLowerCase() == 'rest'){
                  self._requestcontext.request({
                      type: 'post',
                      url: Mura.apiEndpoint + '?method=save',
                      data:  self.getAll(),
                      success: function(  resp) {
                          if (resp.data != 'undefined') {
                              self.set(resp.data)
                              self.set('isdirty',false );
                              if (self.get('saveerrors') ||
                                  Mura.isEmptyObject(self.getErrors())
                              ) {
                                  if (typeof resolve ==  'function') {
                                      resolve(self);
                                  }
                              } else {
                                  if (typeof reject == 'function') {
                                      reject(self);
                                  }
                              }

                          } else {
                              self.set('errors',resp.error);
                              if (typeof reject == 'function') {
                                  reject(self);
                              }
                          }
                      }
                  });
                } else {
                  self._requestcontext.request({
                      type: 'post',
                      url: Mura.apiEndpoint + '?method=generateCSRFTokens',
                      data: {
                          siteid: self.get('siteid'),
                          context: context
                      },
                      success: function(resp) {
                          self._requestcontext.request({
                              type: 'post',
                              url: Mura.apiEndpoint + '?method=save',
                              data: Mura
                                  .extend( self.getAll(), {
                                          'csrf_token': resp.data.csrf_token,
                                          'csrf_token_expires': resp.data.csrf_token_expires
                                      }
                                  ),
                              success: function(  resp) {
                                  if (resp.data != 'undefined'  ) {
                                      self.set(resp.data)
                                      self.set('isdirty',false );
                                      if (self.get('saveerrors') ||
                                          Mura.isEmptyObject(self.getErrors())
                                      ) {
                                          if (typeof resolve ==  'function') {
                                              resolve(self);
                                          }
                                      } else {
                                          if (typeof reject == 'function') {
                                              reject(self);
                                          }
                                      }

                                  } else {
                                      self.set('errors',resp.error);
                                      if (
                                          typeof reject == 'function'
                                      ) {
                                          reject(self);
                                      }
                                  }
                              }
                          });
                      },
                      error: function(resp) {
                          this.success(resp );
                      }
                  });
                }
            });

        }

    },


    /**
     * delete - Deletes entity
     *
     * @return {Promise}
     */
    'delete': function() {

        var self = this;
        if(Mura.mode.toLowerCase() == 'rest'){
          return new Promise(function(resolve, reject) {
            self._requestcontext.request({
                type: 'post',
                url: Mura.apiEndpoint + '?method=delete',
                data: {
                    siteid: self.get('siteid'),
                    id: self.get('id'),
                    entityname: self.get('entityname')
                },
                success: function() {
                    self.set('isdeleted',true);
                    self.cachePurge();
                    if (typeof resolve == 'function') {
                        resolve(self);
                    }
                }
            });
          });
        } else {
          return new Promise(function(resolve, reject) {
              self._requestcontext.request({
                  type: 'post',
                  url: Mura.apiEndpoint + '?method=generateCSRFTokens',
                  data: {
                      siteid: self.get('siteid'),
                      context: self.get('id')
                  },
                  success: function(resp) {
                      self._requestcontext.request({
                          type: 'post',
                          url: Mura.apiEndpoint + '?method=delete',
                          data: {
                              siteid: self.get('siteid'),
                              id: self.get('id'),
                              entityname: self.get('entityname'),
                              'csrf_token': resp.data.csrf_token,
                              'csrf_token_expires': resp.data.csrf_token_expires
                          },
                          success: function() {
                              self.set('isdeleted',true);
                              self.cachePurge();
                              if (typeof resolve == 'function') {
                                  resolve(self);
                              }
                          }
                      });
                  }
              });
          });
        }
    },


    /**
     * getFeed - Returns a Mura.Feed instance of this current entitie's type and siteid
     *
     * @return {object}
     */
    getFeed: function() {
        var siteid = get('siteid') || Mura.siteid;
        var feed=this._requestcontext.getFeed(this.get('entityName'));
        return feed;
    },


    /**
     * cachePurge - Purges this entity from client cache
     *
     * @return {object}  Self
     */
    cachePurge: function() {
        Mura.datacache.purge(this.get('id'));
        return this;
    },


    /**
     * cachePut - Places this entity into client cache
     *
     * @return {object}  Self
     */
    cachePut: function() {
        if (!this.get('isnew')) {
            Mura.datacache.set(this.get('id'), this);
        }
        return this;
    }

});
