const PaymentHelper = require('../../utils/payment-helper');
const DB = require('../db');
const { STRIPE_REDIRECT_URL } = require('../../utils/constants');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
class StripeModel {


    makeSubscriptionId(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }

        var setResult = "KabbikSP" + result;
        return setResult;
    }
//     createStripePayment = async (req) => {
//         try {
//             const { productId, fromRenewal, userId, purchaseType, platform, source } = req.body;

//             if (!productId || !userId) {
//                 return {
//                     success: false,
//                     message: 'Failed to initiate payment'
//                 };
//             }
//             const paymentMode = productId == 1 || (productId == 2 && fromRenewal == 1) ? 'subscription' : 'payment';

//             const priceId = 
//             // productId == 1 ? 'price_1QjgLRH1vuUtwZAvbuYfzEeB'
//             productId==1?'price_1TW8giH1vuUtwZAvnfCmFl2p'
//                 : (productId == 2 && fromRenewal == 1) ?"price_1TW94EH1vuUtwZAvfmfHs9hp" //'price_1QjgLMH1vuUtwZAv2pBIiIKG'
//                     : (productId == 2 && fromRenewal == 0) ? "price_1TW96NH1vuUtwZAvIcgdOATm" //'price_1QjgLIH1vuUtwZAvCmeXgBde'
//                         : productId == 3 ? 'price_1QjgLBH1vuUtwZAv4TcQsDTS' : null;

//             if (!productId || !priceId) {
//                 return {
//                     success: false,
//                     message: 'Subscriptions plan not found'
//                 };
//             }
//             const subscriptionReferenceId = this.makeSubscriptionId(8);

//             const insertSQL = `INSERT INTO stripe_payment 
//                             (subscription_reference_id, user_id, product_id, platform, source, payment_mode, payment_state, purchase_type)
//                              VALUES (?,?,?,?,?,?,?,?)`;

//             const res = await DB.query(insertSQL, [
//                 subscriptionReferenceId,
//                 userId,
//                 productId,
//                 platform,
//                 source,
//                 paymentMode,
//                 "INITIATED",
//                 purchaseType
//             ]);

//             const session = await stripe.checkout.sessions.create(
//                 {
//                     mode: paymentMode,
//                     line_items: [
//                         {
//                             price: priceId,
//                             quantity: 1,
//                         }
//                     ],
//                     success_url: "https://api.kabbik.com/v4/stripe/redirect-url-stripe?session_id={CHECKOUT_SESSION_ID}",
//                     cancel_url: "https://api.kabbik.com/v4/stripe/redirect-url-stripe",
//                     client_reference_id: subscriptionReferenceId, // Replace with your user's ID
//                     metadata: {
//                         user_id: userId,
//                         product_id: productId,
//                         purchase_type: purchaseType
//                     },
//                 }
//             );

//             const updateSql = `UPDATE stripe_payment
// SET session_id = ?, amount = ?, payment_status = ?
// WHERE subscription_reference_id = ?`;

//             try {
//                 await DB.query(updateSql, [
//                     session.id,
//                     session.amount_total,
//                     session.payment_status,
//                     subscriptionReferenceId
//                 ]);
//             } catch (e) {
//                 console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeee", e)
//             }

//             return {
//                 success: true,
//                 data: {
//                     sessionId: session.id,
//                     mode: session.mode,
//                     price: session.amount_total,
//                     callBackUrl: session.url,
//                 },
//             };
//         }
//         catch (e) {
//             console.log("Errrrrrrrrrrrrrrror", e);
//             return {
//                 success: false,
//                 message: "Failed Payment"
//             };
//         }
//     }

    createStripePayment = async (req) => {
        try {
            const {
                productId,
                fromRenewal,
                userId,
                purchaseType,
                platform,
                source,
                paymentMethod
            } = req.body;

            if (!productId || !userId) {
                return {
                    success: false,
                    message: 'Failed to initiate payment'
                };
            }

            const paymentMode =
                productId == 1 || (productId == 2 && fromRenewal == 1)
                    ? 'subscription'
                    : 'payment';

            const priceId =
                productId == 1 ? 'price_1TW8giH1vuUtwZAvnfCmFl2p'
                : (productId == 2 && fromRenewal == 1) ? 'price_1TW94EH1vuUtwZAvfmfHs9hp'
                : (productId == 2 && fromRenewal == 0) ? 'price_1TW96NH1vuUtwZAvIcgdOATm'
                : productId == 3 ? 'price_1QjgLBH1vuUtwZAv4TcQsDTS'
                : null;

            if (!priceId) {
                return {
                    success: false,
                    message: 'Subscriptions plan not found'
                };
            }

            const subscriptionReferenceId = this.makeSubscriptionId(8);

            const insertSQL = `INSERT INTO stripe_payment
                (subscription_reference_id, user_id, product_id, platform, source, payment_mode, payment_state, purchase_type, requested_payment_method)
                VALUES (?,?,?,?,?,?,?,?,?)`;

            await DB.query(insertSQL, [
                subscriptionReferenceId,
                userId,
                productId,
                platform || 'WEB',
                source,
                paymentMode,
                'INITIATED',
                purchaseType,
                paymentMethod || null
            ]);

            const session = await stripe.checkout.sessions.create({
                mode: paymentMode,
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    }
                ],
                success_url: `${STRIPE_REDIRECT_URL}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: STRIPE_REDIRECT_URL,
                client_reference_id: subscriptionReferenceId,
                metadata: {
                    user_id: String(userId),
                    product_id: String(productId),
                    purchase_type: String(purchaseType || ''),
                    requested_payment_method: paymentMethod || '',
                    platform: platform || 'WEB'
                }
            });

            const updateSql = `UPDATE stripe_payment
                SET session_id = ?, amount = ?, payment_status = ?
                WHERE subscription_reference_id = ?`;

            await DB.query(updateSql, [
                session.id,
                session.amount_total,
                session.payment_status,
                subscriptionReferenceId
            ]);

            return {
                success: true,
                data: {
                    sessionId: session.id,
                    mode: session.mode,
                    price: session.amount_total,
                    callBackUrl: session.url,
                },
            };
        } catch (e) {
            console.log("Errrrrrrrrrrrrrrror", e);
            return {
                success: false,
                message: "Failed Payment"
            };
        }
    }


    manageSubscriptions = async (req) => {
        try {
            const { subscriptionId } = req.body;
            var returnValue = {
                success: false
            }
            if (!subscriptionId) {
                returnValue.success = false;
                return returnValue;
            }
            const portalSession = await stripe.billingPortal.sessions.create({
                customer: subscriptionId,
                return_url: "https://kabbik.com/payment-status?status=COMPLETED"
            });
            returnValue.success = true;
            returnValue.redirectUrl = portalSession.url;
            return returnValue;
        }
        catch (e) {
            console.log("Errrrrrrrrrrrrrrrrrror ", e)
            returnValue.success = false;
            return returnValue;
        }
    }

    // stripeWebhook = async (req) => {
    //     var returnValue = {
    //         success: false,
    //         message: "Something went wrong"
    //     };



    //     const sig = req.headers['stripe-signature'];
    //     console.log("stripeWebhookstripeWebhookstripeWebhookstripeWebhookstripeWebhookstripeWebhookstripeWebhook", req.body)


    //     const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_KEY;

    //     let event;

    //     try {
    //         event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    //     } catch (err) {
    //         console.error('⚠️  Webhook signature verification failed.', err);
    //         return returnValue;
    //     }

    //     switch (event.type) {
    //         case 'checkout.session.completed':
    //             const paymentResult = event.data.object;
    //     console.log("paymentResult paymentResult paymentResult paymentResult ", paymentResult )

    //             const updateSql = `UPDATE stripe_payment SET name = ?, eamil = ?,
    //         phone = ?, body_response = ?, currency = ?, country = ?,
    //          payment_status = ?, payment_state = ?, customer_id = ?, subscription_id = ?, invoice_id = ?, is_succeed = ?
    //          WHERE subscription_reference_id = ?`;

    //             try {
    //                 await DB.query(updateSql, [
    //                     paymentResult.customer_details.name,
    //                     paymentResult.customer_details.email,
    //                     paymentResult.customer_details.phone,
    //                     JSON.stringify(paymentResult),
    //                     paymentResult.currency,
    //                     paymentResult.customer_details.address.country,
    //                     paymentResult.payment_status,
    //                     "COMPLETED",
    //                     paymentResult.customer,
    //                     paymentResult.subscription,
    //                     paymentResult.invoice,
    //                     paymentResult.payment_status == 'paid' ? 1 : 0,
    //                     paymentResult.client_reference_id,
    //                 ]);
    //             } catch (e) {
    //             }

    //             if (paymentResult.payment_status == 'paid') {
    //                 const userId = paymentResult.metadata.user_id;
    //                 const productId = paymentResult.metadata.product_id;
    //                 const paymentMethod = paymentResult.mode == 'subscription' ? "STRIPE_SUBS" : "STRIPE_ONE_TIME";


    //                 var someDate = new Date();
    //                 var numberOfDaysToAdd = 6;

    //                 if (productId != null && productId == '1') {
    //                     numberOfDaysToAdd = 30
    //                 }
    //                 if (productId != null && productId == '2') {
    //                     numberOfDaysToAdd = 180
    //                 }
    //                 if (productId != null && productId == '3') {
    //                     numberOfDaysToAdd = 365
    //                 }
    //                 var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
    //                 var currentDateTime = new Date().valueOf()
    //                 var nextPaymentDateTime = result444

    //                 try {
    //                     const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
    //                     await DB.query(sqlUpdateUser, [true, paymentResult.customer, paymentMethod, productId, currentDateTime, nextPaymentDateTime, 0, userId]);

    //                     const findUsersSql = `SELECT * from users where id = ?`;
    //                     const findUsers = await DB.query(findUsersSql, [
    //                         userId
    //                     ]);

    //                     await PaymentHelper.insertUserPaymentLog(
    //                         userId,
    //                         findUsers[0].user_name,
    //                         paymentResult.customer_details.name,
    //                         productId,
    //                         paymentMethod,
    //                         "Subscription",
    //                         1,
    //                         paymentResult.mode == 'subscription' ? 1 : 0,
    //                         "SUCCEEDED_PAYMENT",
    //                         1,
    //                         paymentResult.customer_details.phone,
    //                         paymentResult.customer,
    //                         productId == '1' ? 118 : productId == '2' ? 598 : productId == '3' ? 1198 : 0,
    //                         null,
    //                         0,
    //                         someDate
    //                     );
    //                 }
    //                 catch (e) { }
    //             }

    //             break;

    //         case 'invoice.payment_succeeded':
    //             const invoice = event.data.object;
    //             const billingReason = invoice.billing_reason;
    //             if (billingReason === 'subscription_cycle') {
    //                 try {

    //                     try {
    //                         const insertWebhook = `INSERT INTO stripe_webhook 
    //                         (customer_id, subscription_id, attam_count, amount, body_response)
    //                          VALUES (?,?,?,?,?)`;

    //                         await DB.query(insertWebhook, [
    //                             invoice.customer,
    //                             invoice.subscription,
    //                             invoice.attempt_count,
    //                             invoice.total,
    //                             JSON.stringify(invoice)
    //                         ]);
    //                     }
    //                     catch (e) {
    //                         console.log("erroooooooooooooor", e);
    //                     }
    //                     const findInvoice = `SELECT * from stripe_payment as st WHERE st.customer_id = ?`;
    //                     const prevInvocie = await DB.query(findInvoice, invoice.customer);
    //                     const userId = prevInvocie[0].user_id;
    //                     const productId = prevInvocie[0].product_id;
    //                     const paymentMethod = "STRIPE_SUBS";
    //                     var someDate = new Date();
    //                     var numberOfDaysToAdd = 6;

    //                     if (productId != null && productId == '1') {
    //                         numberOfDaysToAdd = 30
    //                     }
    //                     if (productId != null && productId == '2') {
    //                         numberOfDaysToAdd = 180
    //                     }
    //                     if (productId != null && productId == '3') {
    //                         numberOfDaysToAdd = 365
    //                     }
    //                     var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
    //                     var currentDateTime = new Date().valueOf()
    //                     var nextPaymentDateTime = result444

    //                     try {
    //                         const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
    //                         await DB.query(sqlUpdateUser, [true, invoice.customer, paymentMethod, productId, currentDateTime, nextPaymentDateTime, 0, userId]);


    //                         const findUsersSql = `SELECT * from users where id = ?`;
    //                         const findUsers = await DB.query(findUsersSql, [
    //                             userId
    //                         ]);

    //                         await PaymentHelper.insertUserPaymentLog(
    //                             userId,
    //                             findUsers[0].user_name,
    //                             prevInvocie[0].name,
    //                             productId,
    //                             paymentMethod,
    //                             "Subscription",
    //                             0,
    //                             1,
    //                             "SUCCEEDED_PAYMENT",
    //                             1,
    //                             prevInvocie[0].phone,
    //                             invoice.customer,
    //                             productId == '1' ? 118 : productId == '2' ? 598 : productId == '3' ? 1198 : 0,
    //                             null,
    //                             0,
    //                             someDate
    //                         );

    //                     }
    //                     catch (e) {
    //                         console.log("erroooooooooooooor", e);
    //                     }
    //                 }
    //                 catch (e) {
    //                     console.log("erroooooooooooooor", e);
    //                 }
    //             }
    //             break;

    //         case 'invoice.payment_failed':
    //             console.log("Renewal subscriptions Failed");
    //             console.log(event.data);
    //             break;

    //         case 'customer.subscription.updated':
    //             const cancelEventRes = event.data.object;
    //             if (cancelEventRes.cancel_at != null && cancelEventRes.cancellation_details.comment == null && cancelEventRes.cancellation_details.feedback == null) {
    //                 try {
    //                     const insertStripeWebhook = `INSERT INTO stripe_webhook 
    //                     (customer_id, subscription_id, cancel_at, body_response)
    //                      VALUES (?,?,?,?)`;

    //                     await DB.query(insertStripeWebhook, [
    //                         cancelEventRes.customer,
    //                         cancelEventRes.id,
    //                         cancelEventRes.cancel_at,
    //                         JSON.stringify(cancelEventRes)
    //                     ]);
    //                     const sqlUpdateUser = `UPDATE users SET canceled_subscription = ? WHERE subscription_id = ?`;
    //                     await DB.query(sqlUpdateUser, [1, cancelEventRes.customer]);

    //                     const findInvoice = `SELECT * from stripe_payment as st WHERE st.customer_id = ?`;
    //                     const prevInvocie = await DB.query(findInvoice, cancelEventRes.customer);

    //                     await PaymentHelper.insertUserPaymentLog(
    //                         prevInvocie[0].user_id,
    //                         prevInvocie[0].name,
    //                         prevInvocie[0].name,
    //                         prevInvocie[0].product_id,
    //                         'STRIPE_SUBS',
    //                         "Subscription",
    //                         0,
    //                         1,
    //                         "UNSUBSCRIBED",
    //                         0,
    //                         prevInvocie[0].phone,
    //                         cancelEventRes.customer,
    //                         0,
    //                         null,
    //                         1,
    //                         null
    //                     );

    //                 }
    //                 catch (e) {
    //                     console.log("erroooooooooooooor", e);
    //                 }
    //             }
    //             break;

    //         default:
    //             console.log(`Unhandle event type ${event.type}`);
    //             break;
    //     }

    //     returnValue.success = true;
    //     returnValue.message = "sucess";

    //     return returnValue
    // }

    stripeWebhook = async (req) => {
        var returnValue = {
            success: false,
            message: "Something went wrong"
        };
    
        const sig = req.headers['stripe-signature'];
            
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_KEY;
    
        let event;
    
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error('Webhook signature verification failed.', err);
            return returnValue;
        }
    
        switch (event.type) {
            case 'checkout.session.completed':
                const paymentResult = event.data.object;
                    
                const updateSql = `UPDATE stripe_payment SET name = ?, eamil = ?,
            phone = ?, body_response = ?, currency = ?, country = ?,
             payment_status = ?, payment_state = ?, customer_id = ?, subscription_id = ?, invoice_id = ?, is_succeed = ?
             WHERE subscription_reference_id = ?`;
    
                try {
                    await DB.query(updateSql, [
                        paymentResult.customer_details.name,
                        paymentResult.customer_details.email,
                        paymentResult.customer_details.phone,
                        JSON.stringify(paymentResult),
                        paymentResult.currency,
                        paymentResult.customer_details.address.country,
                        paymentResult.payment_status,
                        "COMPLETED",
                        paymentResult.customer,
                        paymentResult.subscription,
                        paymentResult.invoice,
                        paymentResult.payment_status == 'paid' ? 1 : 0,
                        paymentResult.client_reference_id,
                    ]);
                } catch (e) {
                    console.log("stripe payment update error", e)
                }
    
                if (paymentResult.payment_status == 'paid') {
                    const userId = paymentResult.metadata.user_id;
                    const productId = paymentResult.metadata.product_id;
    
                    let paymentMethod = paymentResult.mode == 'subscription' ? "STRIPE_SUBS" : "STRIPE_ONE_TIME";
    
                    try {
                        if (paymentResult.payment_intent) {
                            const paymentIntent = await stripe.paymentIntents.retrieve(
                                paymentResult.payment_intent,
                                { expand: ['latest_charge'] }
                            );
    
                            const walletType = paymentIntent &&
                                paymentIntent.latest_charge &&
                                paymentIntent.latest_charge.payment_method_details &&
                                paymentIntent.latest_charge.payment_method_details.card &&
                                paymentIntent.latest_charge.payment_method_details.card.wallet &&
                                paymentIntent.latest_charge.payment_method_details.card.wallet.type
                                ? paymentIntent.latest_charge.payment_method_details.card.wallet.type
                                : null;
    
                            if (walletType === 'google_pay') {
                                paymentMethod = paymentResult.mode == 'subscription'
                                    ? "STRIPE_GOOGLE_PAY_SUBS"
                                    : "STRIPE_GOOGLE_PAY_ONE_TIME";
                            }
                        }
                    } catch (e) {
                        console.log("google pay detect error", e)
                    }
    
                    var someDate = new Date();
                    var numberOfDaysToAdd = 6;
    
                    if (productId != null && productId == '1') {
                        numberOfDaysToAdd = 30
                    }
                    if (productId != null && productId == '2') {
                        numberOfDaysToAdd = 180
                    }
                    if (productId != null && productId == '3') {
                        numberOfDaysToAdd = 365
                    }
                    var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
                    var currentDateTime = new Date().valueOf()
                    var nextPaymentDateTime = result444
    
                    try {
                        const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
                        await DB.query(sqlUpdateUser, [true, paymentResult.customer, paymentMethod, productId, currentDateTime, nextPaymentDateTime, 0, userId]);
    
                        const findUsersSql = `SELECT * from users where id = ?`;
                        const findUsers = await DB.query(findUsersSql, [
                            userId
                        ]);
    
                        await PaymentHelper.insertUserPaymentLog(
                            userId,
                            findUsers[0].user_name,
                            paymentResult.customer_details.name,
                            productId,
                            paymentMethod,
                            "Subscription",
                            1,
                            paymentResult.mode == 'subscription' ? 1 : 0,
                            "SUCCEEDED_PAYMENT",
                            1,
                            paymentResult.customer_details.phone,
                            paymentResult.customer,
                            productId == '1' ? 118 : productId == '2' ? 598 : productId == '3' ? 1198 : 0,
                            null,
                            0,
                            someDate
                        );
                    }
                    catch (e) {
                        console.log("user update after checkout error", e)
                    }
                }
    
                break;
    
            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                const billingReason = invoice.billing_reason;
                if (billingReason === 'subscription_cycle') {
                    try {
    
                        try {
                            const insertWebhook = `INSERT INTO stripe_webhook 
                            (customer_id, subscription_id, attam_count, amount, body_response)
                             VALUES (?,?,?,?,?)`;
    
                            await DB.query(insertWebhook, [
                                invoice.customer,
                                invoice.subscription,
                                invoice.attempt_count,
                                invoice.total,
                                JSON.stringify(invoice)
                            ]);
                        }
                        catch (e) {
                            console.log("erroooooooooooooor", e);
                        }
                        const findInvoice = `SELECT * from stripe_payment as st WHERE st.customer_id = ?`;
                        const prevInvocie = await DB.query(findInvoice, invoice.customer);
                        const userId = prevInvocie[0].user_id;
                        const productId = prevInvocie[0].product_id;
    
                        let paymentMethod = "STRIPE_SUBS";
    
                        try {
                            const stripeInvoice = await stripe.invoices.retrieve(invoice.id, {
                                expand: ['payment_intent.latest_charge']
                            });
    
                            const walletType = stripeInvoice &&
                                stripeInvoice.payment_intent &&
                                stripeInvoice.payment_intent.latest_charge &&
                                stripeInvoice.payment_intent.latest_charge.payment_method_details &&
                                stripeInvoice.payment_intent.latest_charge.payment_method_details.card &&
                                stripeInvoice.payment_intent.latest_charge.payment_method_details.card.wallet &&
                                stripeInvoice.payment_intent.latest_charge.payment_method_details.card.wallet.type
                                ? stripeInvoice.payment_intent.latest_charge.payment_method_details.card.wallet.type
                                : null;
    
                            if (walletType === 'google_pay') {
                                paymentMethod = "STRIPE_GOOGLE_PAY_SUBS";
                            }
                        } catch (e) {
                            console.log("invoice google pay detect error", e)
                        }
    
                        var someDate = new Date();
                        var numberOfDaysToAdd = 6;
    
                        if (productId != null && productId == '1') {
                            numberOfDaysToAdd = 30
                        }
                        if (productId != null && productId == '2') {
                            numberOfDaysToAdd = 180
                        }
                        if (productId != null && productId == '3') {
                            numberOfDaysToAdd = 365
                        }
                        var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
                        var currentDateTime = new Date().valueOf()
                        var nextPaymentDateTime = result444
    
                        try {
                            const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;
                            await DB.query(sqlUpdateUser, [true, invoice.customer, paymentMethod, productId, currentDateTime, nextPaymentDateTime, 0, userId]);
    
                            const findUsersSql = `SELECT * from users where id = ?`;
                            const findUsers = await DB.query(findUsersSql, [
                                userId
                            ]);
    
                            await PaymentHelper.insertUserPaymentLog(
                                userId,
                                findUsers[0].user_name,
                                prevInvocie[0].name,
                                productId,
                                paymentMethod,
                                "Subscription",
                                0,
                                1,
                                "SUCCEEDED_PAYMENT",
                                1,
                                prevInvocie[0].phone,
                                invoice.customer,
                                productId == '1' ? 118 : productId == '2' ? 598 : productId == '3' ? 1198 : 0,
                                null,
                                0,
                                someDate
                            );
    
                        }
                        catch (e) {
                            console.log("erroooooooooooooor", e);
                        }
                    }
                    catch (e) {
                        console.log("erroooooooooooooor", e);
                    }
                }
                break;
    
            case 'invoice.payment_failed':
                                                break;
    
            case 'customer.subscription.updated':
                const cancelEventRes = event.data.object;
                if (cancelEventRes.cancel_at != null && cancelEventRes.cancellation_details.comment == null && cancelEventRes.cancellation_details.feedback == null) {
                    try {
                        const insertStripeWebhook = `INSERT INTO stripe_webhook 
                        (customer_id, subscription_id, cancel_at, body_response)
                         VALUES (?,?,?,?)`;
    
                        await DB.query(insertStripeWebhook, [
                            cancelEventRes.customer,
                            cancelEventRes.id,
                            cancelEventRes.cancel_at,
                            JSON.stringify(cancelEventRes)
                        ]);
                        const sqlUpdateUser = `UPDATE users SET canceled_subscription = ? WHERE subscription_id = ?`;
                        await DB.query(sqlUpdateUser, [1, cancelEventRes.customer]);
    
                        const findInvoice = `SELECT * from stripe_payment as st WHERE st.customer_id = ?`;
                        const prevInvocie = await DB.query(findInvoice, cancelEventRes.customer);
    
                        await PaymentHelper.insertUserPaymentLog(
                            prevInvocie[0].user_id,
                            prevInvocie[0].name,
                            prevInvocie[0].name,
                            prevInvocie[0].product_id,
                            'STRIPE_SUBS',
                            "Subscription",
                            0,
                            1,
                            "UNSUBSCRIBED",
                            0,
                            prevInvocie[0].phone,
                            cancelEventRes.customer,
                            0,
                            null,
                            1,
                            null
                        );
    
                    }
                    catch (e) {
                        console.log("erroooooooooooooor", e);
                    }
                }
                break;
    
            default:
                                break;
        }
    
        returnValue.success = true;
        returnValue.message = "sucess";
    
        return returnValue
    }
}

module.exports = new StripeModel