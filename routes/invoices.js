const express = require('express')
const ExpressError = require('../expressError')
const router = express.Router()
const db = require('../db')

/** Returns info on invoices, like {invoices: [{id, comp_code}, ...]} */
router.get('/', async (req, res, next) => {
  try {
    const invoicesQuery = await db.query(`SELECT id, comp_code FROM invoices`)
    return res.json({ invoices: invoicesQuery.rows })
  } catch (err) {
    return next(err)
  }
})

/** Returns obj of a given invoice: {invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}} */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await db.query(
      `SELECT i.id,
              i.comp_code,
              i.amt,
              i.paid,
              i.add_date,
              c.name,
              c.description
      FROM invoices AS i
        JOIN companies AS c ON (i.comp_code = c.code)
      WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      let notFoundError = new Error(`No invoice with id of '${id}' exists.`)
      notFoundError.status = 404
      throw notFoundError
    }

    const data = result.rows[0]

    const invoice = {
      id: data.id,
      company: {
        code: data.comp_code,
        name: data.name,
        description: data.description,
      },
      amt: data.amt,
      paid: data.paid,
      add_date: data.add_date,
      paid_date: data.paid_date,
    }
    return res.json({ invoice: invoice })
  } catch (err) {
    return next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    let { comp_code, amt } = req.body
    const result = await db.query(
      `INSERT INTO invoices (comp_code, amt)
      VALUES ($1, $2)
      RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [comp_code, amt]
    )
    console.log(result)
    return res.status(201).json({ invoice: result.rows[0] })
  } catch (err) {
    return next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    let { amt, paid } = req.body
    let { id } = req.params
    let paidDate = null

    // query the db to get the current paid value of the invoice with the given id
    const currentResult = await db.query(
      `SELECT paid
      FROM invoices
      WHERE id = $1`,
      [id]
    )
    // if there is no invoice with given id, throw an error
    if (currentResult.rows.length === 0) {
      throw new ExpressError(`No invoice with ${id} exists`, 404)
    }

    const currentPaidDate = currentResult.rows[0].paid_date
    //set 'paidDate' to the current date if currentPaidDate is null and the invoice has been paid
    if (!currentPaidDate && paid) {
      paidDate = new Date()
    } else if (!paid) {
      // if invoice has not been paid, then there is no paidDate
      paidDate = null
    } else {
      paidDate = currentPaidDate
    }

    // update invoice in db with new values and return the invoice info
    const result = await db.query(
      `UPDATE invoices
      SET amt=$1, paid=$2, paid_date=$3
      WHERE id=$4
      RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [amt, paid, paidDate, id]
    )

    return res.json({ invoice: result.rows[0] })
  } catch (err) {
    return next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    let { id } = req.params
    const result = await db.query(
      `DELETE FROM invoices
      WHERE id = $1
      RETURNING id`,
      [id]
    )
    if (result.rows.length === 0) {
      throw new ExpressError(`Invoice with id ${id} does not exist`)
    }
    return res.json({ message: 'Invoice deleted' })
  } catch (err) {
    return next(err)
  }
})

module.exports = router
