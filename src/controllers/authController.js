const authService = require('../services/authService');





const register =async (req,res) => {  
try{
  const {email, password, fullName, phone}=req.body;

  // Validate required fields
  if(!email || !password || !fullName){
  return res.status(400).json({
    status: 'error',
    message: 'missing required fields',

  });
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)){
  return res.status(400).json({
    status:'error',
    message: 'invalid email format',

  });
}

if (password.length < 6 ) {
return res.status(400).json({
  status:'error',
  message: 'password must be at least 6 characters long',
})
}


const result = await authService.register(email,password,fullName,phone);

res.status(201).json({
  status:"success",
  message: 'successfully registered',
  data: result,
});


}
catch (error) {
console.error('Registration error:',error);
res.status(400).json({
  status:'error',
  message: error.message,
});




}
};








// Login user
const login =async (req,res)=>{

  try{
    const {email,password}=req.body;
    if (!email || !password){
      return res.status(400).json({
        status:'error',
        message :'email and password are required',
      });
    }

    const result = await authService.login(email,password);
    res.status(200).json({
      status:'success',
      message:'login successful',
      data: result,
    });

  }
  catch (error){
    return res.status(401).json({
      status:'error',
      message: error.message,
    });

  }


};





// Refresh token
const refresh =async (req,res) => {
try {
const {refreshToken} = req.body;

if (!refreshToken){
  return res.status(400).json({
    status:'error',
    message:'refresh token is required',
  });
}
const result = await authService.refresh(refreshToken);
res.status(200).json({
  status:'success',
  message:'token refreshed',
  data: result,
});
}catch (error) {
return res.status(401).json({
  status:'error',
  message: error.message,

});



}
};


// Get current user profile
const getCurrentUser =async (req,res) => {
try{
  const userId=req.user.userId;
  const result = await authService.getCurrentUser(userId);
  res.status(200).json({
    status:'success',
    data: result,


  });

}catch(error){
  return res.status(400).json({
    status:'error',
    message: error.message,
  });
}

};



const logout =async (req,res) =>{

  try{
    const userId = req.user.userId;
    const refreshToken = req.body.refreshToken;
    await authService.logout(userId,refreshToken);

    res.status(200).json({
      status:'success',
      message:'logged out successfully',
    });
  }catch (error){
    return res.status(400).json({
      status:'error',
      message: error.message,
    });

  }



};















module.exports = {
  register,
  login,
  refresh,
  getCurrentUser,
  logout,
};


