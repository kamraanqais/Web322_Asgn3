
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
    description: DataTypes.TEXT,
    dueDate: DataTypes.DATEONLY,
    status: {
      type: DataTypes.ENUM('pending', 'completed'),
      defaultValue: 'pending'
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'Tasks',
    timestamps: true
  });

  
  return Task;
};