// models/task.js — FINAL UPDATED VERSION
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATEONLY,   // <-- Correct type for YYYY-MM-DD
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("pending", "completed"),
      allowNull: false,
      defaultValue: "pending"
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: "Tasks",
    timestamps: true
  });

  return Task;
};
