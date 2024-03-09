const { connection } = require('../../models/connection');
const { promisify } = require('util');
const config = require('../../config/env/development');


const getCouponList = async (req, res) => {
  const queryAsync = promisify(connection.query).bind(connection);
  try {
    // const  loggedInUserId  = 2;
    const query = "SELECT *  FROM coupons WHERE is_deleted = 0 AND is_active = 1";
    const couponLists = await queryAsync(query);
    res.json({ couponList: couponLists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};
const couponDetail = async (req, res) => {
  const couponId = req.params.couponId
  const queryAsync = promisify(connection.query).bind(connection);
  try {
    // const  loggedInUserId  = 2;
    const query = "SELECT *  FROM coupons WHERE is_deleted = 0 AND is_active = 1 AND id=?";
    const couponDetail = await queryAsync(query,[couponId]);
    res.json({ couponDetails: couponDetail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
};
const applyCoupon = async (req, res) => {
  const {
    customer_id,
    cart_id,
    couponCode,
  } = req.body;

  const queryAsync = promisify(connection.query).bind(connection);

  try {
    const couponQuery = 'SELECT * FROM coupons WHERE coupon_code = ? AND expiration_date >= CURDATE()';
    const coupons = await queryAsync(couponQuery, [couponCode]);

    if (coupons.length === 0) {
      res.status(404).json({ error: 'Coupon not found or expired' });
      return;
    }

    const coupon = coupons[0];

    const couponUsageQuery = 'SELECT COUNT(*) AS usageCount FROM cart_coupon_details WHERE customer_id = ? AND coupon_id = ?';
    const couponUsageResult = await queryAsync(couponUsageQuery, [customer_id, coupon.id]);

    if (couponUsageResult[0].usageCount >= coupon.coupon_usage) {
      res.status(400).json({ error: 'Coupon usage limit exceeded' });
      return;
    }

    const insertCouponQuery = 'INSERT INTO cart_coupon_details (cart_id, coupon_id, customer_id) VALUES (?, ?, ?)';
    await queryAsync(insertCouponQuery, [cart_id, coupon.id, customer_id]);

    res.json({ message: 'Coupon applied successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};




module.exports = {
    getCouponList,
    couponDetail,
    applyCoupon
};