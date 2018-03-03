const { MongoClient } = require('mongodb');

class EnmapMongo {

  constructor(options) {
    this.defer = new Promise((resolve) => {
      this.ready = resolve;
    });

    if (!options.name) throw new Error('Must provide options.name');
    this.name = options.name;

    this.validateName();

    this.auth = options.user && options.password ? `${options.user}:${options.password}@` : '';
    this.dbName = options.dbName || 'enmap';
    this.port = options.port || 27017;
    this.host = options.host || 'localhost';

    this.url = options.url || `mongodb://${this.auth}${this.host}:${this.port}/${this.dbName}`;
  }

  /**
   * Internal method called on persistent Enmaps to load data from the underlying database.
   * @param {Map} enmap In order to set data to the Enmap, one must be provided.
   * @returns {Promise} Returns the defer promise to await the ready state.
   */
  async init(enmap) {
    this.client = await MongoClient.connect(this.url);
    this.db = this.client.db(this.dbName).collection(this.name);
    const rows = await this.db.find({}).toArray();
    for (const row of rows) {
      enmap.set(row._id, row.value);
    }
    this.ready();
    return this.defer;
  }

  /**
   * Shuts down the underlying persistent enmap database.
   */
  close() {
    this.client.close();
  }

  /**
   * Set a value to the Enmap.
   * @param {(string|number)} key Required. The key of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be a string or number.
   * @param {*} val Required. The value of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be stringifiable as JSON.
   */
  set(key, val) {
    if (!key || !['String', 'Number'].includes(key.constructor.name)) {
      throw new Error('Keys should be strings or numbers.');
    }
    this.db.update({ _id: key }, { _id: key, value: val }, { upsert: true });
  }

  /**
   * Asynchronously ensure a write to the Enmap.
   * @param {(string|number)} key Required. The key of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be a string or number.
   * @param {*} val Required. The value of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be stringifiable as JSON.
   */
  async setAsync(key, val) {
    if (!key || !['String', 'Number'].includes(key.constructor.name)) {
      throw new Error('Keys should be strings or numbers.');
    }
    await this.db.update({ _id: key }, { _id: key, value: val }, { upsert: true });
  }

  /**
   * Delete an entry from the Enmap.
   * @param {(string|number)} key Required. The key of the element to delete from the EnMap object.
   * @param {boolean} bulk Internal property used by the purge method.
   */
  delete(key) {
    this.db.remove({ _id: key }, { single: true });
  }

  /**
   * Asynchronously ensure an entry deletion from the Enmap.
   * @param {(string|number)} key Required. The key of the element to delete from the EnMap object.
   * @param {boolean} bulk Internal property used by the purge method.
   */
  async deleteAsync(key) {
    await this.db.remove({ _id: key }, { single: true });
  }

  /**
   * Internal method used to validate persistent enmap names (valid Windows filenames)
   * @private
   */
  validateName() {
    // Do not delete this internal method.
    this.name = this.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

}

module.exports = EnmapMongo;
