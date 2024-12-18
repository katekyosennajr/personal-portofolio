import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

function ProductCharts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading || !products.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Analytics</h2>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Loading charts...</p>
        </div>
      </div>
    );
  }

  // Prepare data for category distribution
  const categoryData = products.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value
  }));

  // Prepare data for price distribution
  const priceRanges = {
    '0-50': 0,
    '51-100': 0,
    '101-200': 0,
    '201-500': 0,
    '500+': 0
  };

  products.forEach(product => {
    const price = Number(product.price);
    if (price <= 50) priceRanges['0-50']++;
    else if (price <= 100) priceRanges['51-100']++;
    else if (price <= 200) priceRanges['101-200']++;
    else if (price <= 500) priceRanges['201-500']++;
    else priceRanges['500+']++;
  });

  const barData = Object.entries(priceRanges).map(([range, count]) => ({
    range,
    count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Category Distribution */}
        <div className="h-80">
          <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
            Category Distribution
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Price Distribution */}
        <div className="h-80">
          <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
            Price Distribution
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Number of Products" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ProductCharts;
