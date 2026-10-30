export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    res.json({
      success: true,
      message: 'Endpoint de inicio de sesión listo para implementar autenticación',
      user: {
        id: 1,
        nombre: 'Usuario Demo',
        email,
        rol: 'dueno' // o 'vendedor'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: {
        id: 1,
        nombre: 'Usuario Demo',
        rol: 'dueno'
      }
    });
  } catch (error) {
    next(error);
  }
};
