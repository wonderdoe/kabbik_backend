module.exports = class StatusCheck {



    static checkStatus(statusCode){
        
        switch (statusCode) {
            case "1001":
                return "METHOD_ARGUMENT_INVALID";
            case "1002":
                return "METHOD_ARGUMENT_TYPE_MISMATCH";
            case "1003":
                return "HTTP_MESSAGE_UNREADABLE";
            case "1004":
                return "DATA_INTEGRITY_VIOLATION";
            case "2000":
                return "INVALID_SUBSCRIPTION_FIELD";
            case "2001":
                return "START_DATE_EXCEEDS_CURRENT_DATE";
            case "2002":
                return "START_DATE_IS_PREVIOUS";
            case "2003":
                return "START_DATE_AFTER_EXPIRY";
            case "2004":
                return "SUBSCRIPTION_REQUEST_ID_USED";
            case "2005":
                return "SERVICE_ID_NOT_FOUND";
            case "2006":
                return "SERVICE_ID_DISABLED";
            case "2007":
                return "SERVICE_ID_FOR_REQUESTER_DISABLED";
            case "2008":
                return "SERVICE_ID_FOR_REQUESTER_NOT_FOUND";
            case "2009":
                return "SUBSCRIPTION_NOT_FOUND";
            case "2010":
                return "SUBSCRIPTION_NOT_CANCELLABLE";
            case "2011":
                return "MERCHANT_NOT_VALID_FOR_REQUESTER";
            case "2012":
                return "MERCHANT_NOT_FOUND_SHORTCODE";
            case "2013":
                return "REQUESTER_NOT_FOUND_WITH_API_KEY";
            case "2014":
                return "REQUESTER_NOT_AUTHORIZED";
            case "2015":
                return "SUBSCRIPTION_NOT_EXTENDABLE";
            case "2016":
                return "EXTENDED_END_DATE_INVALID";
            case "2017":
                return "SERVICE_ID_INVALID";
            case "2018":
                return "TRANSACTION_AMOUNT_BELLOW_CONFIGURED_LIMIT";
            case "2019":
                return "MERCHANT_DISABLED";
            case "2020":
                return "MERCHANT_NOT_LINKED";
            case "2021":
                return "START_DATE_OR_EXPIRY_DATE_INVALID";
            case "2022":
                return "START_DATE_AND_EXPIRY_DATE_SAME";
            case "2023":
                return "EXPIRY_DATE_BELLOW_THRESHOLD";
            case "3000":
                return "MERCHANT_NOT_FOUND_WITH_ID";
            case "3001":
                return "FIELD_VALUE_INVALID";
            case "3003":
                return "PAYMENT_NOT_FOUND_WITH_ID";
            case "3004":
                return "SUBSCRIPTION_NOT_FOUND_WITH_ID";
            case "3005":
                return "SUBSCRIPTION_NOT_CANCELLABLE_ADMIN";
            case "3006":
                return "MERCHANT_PASSWORD_ENCRYPTION_FAILED";
            case "3007":
                return "MERCHANT_WITH_WALLET_SHORTCODE_EXISTS";
            case "3008":
                return "OTHER_MERCHANT_WITH_WALLET_SHORTCODE_EXISTS";
            case "3009":
                return "SERVICE_ID_EXISTS";
            case "3010":
                return "SERVICE_WITH_API_SCOPE";
            case "3011":
                return "INVALID_PASSWORD_LENGTH";
            case "2013":
                return "INVALID_SMS_LENGTH";
            case "2015":
                return "MERCHANT_EXISTS";
            default:
                return "STATUS CODE NOT DETECTED";
            // code block
        }
    }


}