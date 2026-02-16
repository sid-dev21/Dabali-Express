"use strict";
/* TypeScript types for the backend domain */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.MenuStatus = exports.MealType = exports.PaymentStatus = exports.PaymentMethod = exports.SubscriptionStatus = exports.SubscriptionType = exports.UserRole = void 0;
// Enum: fixed values for user roles
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["SCHOOL_ADMIN"] = "SCHOOL_ADMIN";
    UserRole["CANTEEN_MANAGER"] = "CANTEEN_MANAGER";
    UserRole["PARENT"] = "PARENT";
    UserRole["STUDENT"] = "STUDENT";
})(UserRole || (exports.UserRole = UserRole = {}));
var SubscriptionType;
(function (SubscriptionType) {
    SubscriptionType["MONTHLY"] = "MONTHLY";
    SubscriptionType["TRIMESTER"] = "TRIMESTER";
    SubscriptionType["ANNUAL"] = "ANNUAL";
})(SubscriptionType || (exports.SubscriptionType = SubscriptionType = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["EXPIRED"] = "EXPIRED";
    SubscriptionStatus["SUSPENDED"] = "SUSPENDED";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["ORANGE_MONEY"] = "ORANGE_MONEY";
    PaymentMethod["MOOV_MONEY"] = "MOOV_MONEY";
    PaymentMethod["CASH"] = "CASH";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var MealType;
(function (MealType) {
    MealType["BREAKFAST"] = "BREAKFAST";
    MealType["LUNCH"] = "LUNCH";
    MealType["DINNER"] = "DINNER";
})(MealType || (exports.MealType = MealType = {}));
var MenuStatus;
(function (MenuStatus) {
    MenuStatus["PENDING"] = "PENDING";
    MenuStatus["APPROVED"] = "APPROVED";
    MenuStatus["REJECTED"] = "REJECTED";
})(MenuStatus || (exports.MenuStatus = MenuStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["MEAL_TAKEN"] = "MEAL_TAKEN";
    NotificationType["MEAL_MISSED"] = "MEAL_MISSED";
    NotificationType["MENU_APPROVED"] = "MENU_APPROVED";
    NotificationType["MENU_REJECTED"] = "MENU_REJECTED";
    NotificationType["ABSENCE"] = "ABSENCE";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
