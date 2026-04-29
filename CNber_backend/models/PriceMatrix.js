const mongoose = require('mongoose')

function upperTrim(value) {
  return String(value || '').trim().toUpperCase()
}

function trimValue(value) {
  return String(value || '').trim()
}

const PriceMatrixSchema = new mongoose.Schema(
  {
    airport: {
      type: String,
      required: true,
      set: upperTrim
    },
    postcodePrefix: {
      type: String,
      required: true,
      set: upperTrim
    },
    serviceType: {
      type: String,
      required: true,
      enum: ['ride', 'pickup', 'dropoff', 'charter', 'point'],
      set: trimValue
    },
    price: { type: Number, required: true },
    enabled: { type: Boolean, default: true },
    note: { type: String, default: '' }
  },
  { timestamps: true }
)

PriceMatrixSchema.index(
  { airport: 1, postcodePrefix: 1, serviceType: 1 },
  { unique: true }
)

module.exports = mongoose.model('PriceMatrix', PriceMatrixSchema)
