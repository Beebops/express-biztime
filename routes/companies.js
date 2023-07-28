const express = require('express')
const ExpressError = require('../expressError')
const router = express.Router()
const db = require('../db')

/** Returns list of companies, like {companies: [{code, name}, ...]} */
router.get('/', async (req, res, next) => {
  try {
    const companiesQuery = await db.query(`SELECT * FROM companies`)
    return res.json({ companies: companiesQuery.rows })
  } catch (err) {
    return next(err)
  }
})

/** Returns obj of company: {company: {code, name, description}} */
router.get('/:code', async (req, res, next) => {
  try {
    const companyQuery = await db.query(
      `SELECT * FROM companies WHERE code = $1`,
      [req.params.code]
    )
    if (companyQuery.rows.length === 0) {
      let notFoundError = new Error(
        `No company with code of '${req.params.code}' exists.`
      )
      notFoundError.status = 404
      throw notFoundError
    }
    return res.json({ company: companyQuery.rows[0] })
  } catch (err) {
    return next(err)
  }
})

/** Adds a new company to db. Returns obj of new company: {company: {code, name, description}} */
router.post('/', async (req, res, next) => {
  try {
    const { code, name, description } = req.body
    const result = await db.query(
      `INSERT INTO companies (code, name, description)
        VALUES ($1, $2, $3)
        RETURNING code, name, description`,
      [code, name, description]
    )
    return res.status(201).json({ company: result.rows[0] })
  } catch (err) {
    return next(err)
  }
})

router.put('/:code', async (req, res, next) => {
  try {
    if ('code' in req.body) {
      throw new ExpressError('Not allowed', 400)
    }

    const { code } = req.params
    const { name, description } = req.body
    const result = await db.query(
      `UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description`,
      [name, description, code]
    )
    if (result.rows.length === 0) {
      throw new ExpressError(`Can't update company with code '${code}'`, 404)
    }
    return res.json({ company: result.rows[0] })
  } catch (err) {
    return next(err)
  }
})

router.delete('/:code', async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM companies WHERE code = $1 RETURNING code`,
      [req.params.code]
    )
    if (result.rows.length === 0) {
      throw new ExpressError(
        `There is no company with code '${req.params.code}'`,
        404
      )
    }
    return res.json({ message: 'Company deleted' })
  } catch (err) {
    return next(err)
  }
})

module.exports = router
