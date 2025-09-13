const sendErrorDev = (err, res)=>{
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })
} 

const sendErrorProd = (err, res)=>{
    //operational: handled errors.
    if(err.isOperational){
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })  
    } 
    //this can be unhandled errors so we don't leak it here  ,jh
    else{
        console.error('ERROR 💥',err);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        })
    }
}

module.exports = (err, req ,res, next)=>{
    //console.log(err.stack);
    err.statusCode = err.statusCode || 500;
    err.status = err.status||'error';
    if( process.env.NODE_ENV === 'production') {
        sendErrorProd(err, res); 
    } else if( process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    }
}