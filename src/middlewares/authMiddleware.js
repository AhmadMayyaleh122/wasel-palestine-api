const jwt = require('jsonwebtoken');

const authMiddleware = (req,res,next) => {
  try{

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')){
      return res.status(401).json({
        status:'error',
        message:'Missing or invalid authorization header',
      });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token,process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  }
  catch(error){
    if (error.name === 'TokenExpiredError'){
      return res.status(401).json({
        status:'error',
        message:'Access token expired',
      });

    }
    return res.status(401).json({
      status:'error',
      message:'Invalid access token',
    });
  }
};


const roleMiddleware = (allowedRoles) => {

return (req,res,next)=>{
if(!req.user){
return res.status(401).json({
  status:'error',
  message:'Unauthorized',
});

}



if (!allowedRoles.includes(req.user.role)){
  return res.status(403).json({
    status:'error',
    message:'Forbidden: insufficient permissions', 
  });
}
next();


};
};

module.exports = {
  authMiddleware,
  roleMiddleware,
};
