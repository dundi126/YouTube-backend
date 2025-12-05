const asyncHandler = (func) => {
  (req, res, next) => {
    Promise.resolve(func(req, res, next)).reject((err) => next(err));
  };
};

export { asyncHandler };

// const asyncHandler = () => { }
// const asyncHandler = (func) => () => { }
// const asyncHandler = (func) => async () => { }

// const asynceHnadler = (func) => async (err, req, res, next) => {
//     try {

//         await (err, req, res, next)

//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message || "Internal server error",
//         })
//     }

// }
