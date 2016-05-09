"use strict";

var fs = require("fs");
var path = require("path");
var Sequelize = require("sequelize");
var env = process.env.NODE_ENV || "development";
var config = require(__dirname + '/../config/database.json')[env];
var sequelize = new Sequelize(config.database, config.username, config.password, config);
var db = {};

db['user'] = sequelize.define('user', {
    id: { type : Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING, allowNull: false },
    email: { type: Sequelize.STRING, allowNull: false },
    password: { type: Sequelize.STRING, allowNull: false },
    is_active: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }
}, {
    indexes: [
        {
            unique: true,
            fields: ['email']
        }
    ],
    timestamps: true
});

db['group'] = sequelize.define('group', {
    id: { type : Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING, allowNull: false },
    creator: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }
}, {
    indexes: [],
    timestamps: true
});

db['member'] = sequelize.define('member', {
    id: { type : Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
}, {
    indexes: [],
    timestamps: true
});

db['menu'] = sequelize.define('menu', {
    id: { type : Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING, allowNull: false },
    price: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    is_available: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false }
}, {
    indexes: [],
    timestamps: true
});

db['setmenu'] = sequelize.define('setmenu', {
    id: { type : Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: Sequelize.STRING, allowNull: false },
    price: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    is_available: { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false },
    group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    list: { type: Sequelize.JSON, allowNull: false }
}, {
    indexes: [],
    timestamps: true
});

db['order'] = sequelize.define('order', {
    id: { type : Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    content: { type: Sequelize.JSON, allowNull: true, defaultValue: null },
    set_content: { type: Sequelize.JSON, allowNull: true, defaultValue: null },
    total_price: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    table_num: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    approve_status: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true }
}, {
    indexes: [],
    timestamps: true
});

db['waiting'] = sequelize.define('waiting', {
    id: { type : Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    menu_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    table_num: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
    is_served: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }
}, {
    indexes: [],
    timestamps: true
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;