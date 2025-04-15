const { Cashfree } = require("cashfree-pg");

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

//console.log("App ID:", process.env.CASHFREE_APP_ID);
//console.log("Secret Key", process.env.CASHFREE_SECRET_KEY);

exports.createOrder = async (orderId, orderAmount, orderCurrency = "IND", customerID, customerPhone) =>
{
    try {
        const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
        const formattedExpiryDate = expiryDate.toISOString();

        const request = {
            order_id: orderId,
            order_amount: orderAmount,
            order_currency: orderCurrency,
            customer_details: {
                customer_id: customerID,
                customer_phone: customerPhone,
            },
            order_meta: {
                return_url: `http://localhost:5000/purchase/payment-status?order_id=${orderId}`,
                payment_methods: "cc, upi, nb"
            },
            order_expiry_time: formattedExpiryDate
        };

        //console.log("Sending request to Cashfree:", JSON.stringify(request, null, 2));

        const response = await Cashfree.PGCreateOrder("2023-08-01", request);
        //console.log("Cashfree Response:", response.data.payment_session_id);

        return response.data.payment_session_id;
    } catch (error) {
        if (error.response) {
            console.error("Cashfree API Error Response:", error.response.data);
        } else {
            console.error("Error creating order:", error.message);
        }
        throw error;
    }
};

exports.getPaymentStatus = async (orderId) => {
    try {

      //console.log("OrderId is :", orderId);
  
      const response = await Cashfree.PGOrderFetchPayments("2023-08-01", orderId);
  
      let getOrderResponse = response.data;
      let orderStatus;
  
      if (
        getOrderResponse.filter(
          (transaction) => transaction.payment_status === "SUCCESS"
        ).length > 0
      ) {
        orderStatus = "SUCCESS"; 
      } else if (
        getOrderResponse.filter(
          (transaction) => transaction.payment_status === "PENDING"
        ).length > 0
      ) {
        orderStatus = "PENDING"; 
      } else {
        orderStatus = "FAILURE";
      }

      //console.log("OrderStatus:", orderStatus);
  
      return orderStatus;
      
    } catch (error) {
      console.error("Error fetching order status:", error.message);
    }
  };
  

