class NumericScaleControl {
  constructor(scale){
    this.scale = scale
  }
  onAdd(map) {
  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl';
  this._container.style.cssText = "background:white;margin:5px 10px;padding:0 5px;border: 1px solid black;"
  this._container.textContent = `1:${this.scale.toFixed(2)}` ;
  return this._container;
  }

  onRemove() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
  }
}

module.exports = {
  NumericScaleControl
};
