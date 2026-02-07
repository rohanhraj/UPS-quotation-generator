module.exports = (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        platform: 'vercel',
        version: '1.0.0'
    });
};
