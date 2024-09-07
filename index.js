import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 150 // límite de 100 solicitudes por IP cada 15 minutos
});

const app = express();
const port = 3000;

// Aplica el limitador en la ruta raíz "/"
app.use("/", apiLimiter);

const API_URL = "https://openlibrary.org";

app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

app.use(morgan("combined")); // Log requests to the console

app.use(express.static("public")); // Use the public folder for static files.


app.get("/", async (req, res) => {
    try {
        const librosData = await axios.get(API_URL + "/trending/daily.json?availability&limit=20");
        
        let librosBuscados = await Promise.all(
            librosData.data.works.map(async (libro) => {
                const work = await axios.get(API_URL + libro.key + ".json");
                return {
                    key: libro.key,
                    title: libro.title || "No title available",
                    author_key: libro.author_key || "No author key available",
                    author_name: libro.author_name || "Unknown Author",
                    cover_i: libro.cover_i || "No Cover Available",
                    first_publish_year: libro.first_publish_year || "Year Not Available",
                    ratings_average: libro.ratings_average || "No ratings available",
                    edition_key: libro.cover_edition_key || "No edition key available",
                    current_edition: libro.cover_edition_key || "No edition key available",
                    description: work.data.description || "No description available",
                    subjects: work.data.subjects || "No subjects available",
                };
            })
        );
        //console.log(librosBuscados);
        res.status(200).render("index.ejs", { content: librosBuscados, type: "book", activeNav: "home", error: null });
    } catch (error) {
        console.log(error);
        res.status(200).render("index.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "book",
            activeNav: "home",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});


//endpoint para cuando se hace una busqueda y se selecciona que sean libros
app.post("/searchBooks", async (req, res) => {
    try {
        //obtener el libro a buscar
        const libroBuscar = req.body.title; //obtener el libro a buscar

        //hacemos un get de busqueda a la api de openlibrary para obtener los libros que coincidan con el titulo, solo 20 y ordenados por rating
        const librosData = await axios.get(
            API_URL + "/search.json?q=" + libroBuscar + "&mode=everything&limit=20"
        );
        if (librosData.data.numFound === 0) {
            res.status(200).render("index.ejs", {
                content: [], // Envía un array vacío para los libros
                type: "book",
                activeNav: "home",
                error: {
                    title: "Error",
                    description: "no books found",
                },
            });
        } else {
            // Extraemos la información de cada libro pero debemos hacer otra petición a la api para obtener la descripción y los subjects
            //formamos un objeto para el array librosBuscados con la author_key, author_name[0], cover_i, first_publish_year, key, title, ratings_average, y todas las edition_key
            //primero limpiamos el array de librosBuscados
            let librosBuscados = await Promise.all(
                librosData.data.docs.map(async (libro) => {
                    const work = await axios.get(API_URL + libro.key + ".json");

                    return {
                        key: libro.key,
                        title: libro.title || "No title available",
                        author_key: libro.author_key || "No author key available",
                        author_name: libro.author_name || "Unknown Author",
                        cover_i: libro.cover_i || "No Cover Available",
                        first_publish_year: libro.first_publish_year || "Year Not Available",
                        ratings_average: libro.ratings_average || "No ratings available",
                        edition_key: libro.edition_key || "No edition key available",
                        current_edition: libro.cover_edition_key || "No edition key available",
                        description: work.data.description || "No description available",
                        subjects: work.data.subjects || "No subjects available",
                    };
                })
            );
            //console.log(req.body); 
            res.status(200).render("index.ejs", { content: librosBuscados, type: "book", activeNav: "home", error: null });
        }
    } catch (error) {
        console.log(error);
        res.status(200).render("index.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "book",
            activeNav: "home",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});

//endpoint para cuando se hace una busqueda y se selecciona que sean autores, por lo que se buscan autores no libros
app.post("/searchAuthors", async (req, res) => {
    try {
        //obtenemos el autor
        const autorBuscar = req.body.title;

        const autoresData = await axios.get(API_URL + "/search/authors.json?q=" + autorBuscar);
        if (autoresData.data.numFound === 0) {
            res.status(200).render("index.ejs", {
                content: [], // Envía un array vacío para los libros
                type: "author",
                activeNav: "home",
                error: {
                    title: "Error",
                    description: error.message,
                },
            });
        } else {
            let autoresBuscados = await Promise.all(
                autoresData.data.docs.map(async (autor) => {
                    const bio = await axios.get(API_URL + "/authors/" + autor.key + ".json");

                    return {
                        name: autor.name || "No name available",
                        birth_date: autor.birth_date || "Birth date not available",
                        top_work: autor.top_work || "Top work not available",
                        bio: bio.data.bio || "Bio not available",
                        subjects: autor.top_subjects || "No subjects available",
                        key: autor.key,
                    };
                })
            );
            //console.log(req.body); 
            res.status(200).render("index.ejs", { content: autoresBuscados, type: "author", activeNav: "home", error: null  });
        }
    } catch (error) {
        console.log(error);
        res.status(200).render("index.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "author",
            activeNav: "home",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});

//endopint de busqueda de libros por genero
app.post("/searchGenres", async (req, res) => {
    try {
        //extraemos el genero
        const generoBuscar = req.body.title;

        //buscamos los libros que coincidan con el genero, solo 20 y ordenados por rating
        const librosData = await axios.get(API_URL + "/subjects/" + generoBuscar + ".json?limit=20&sort=rating");

        if (librosData.data.work_count === 0) {
            res.status(200).render("index.ejs", {
                content: [], // Envía un array vacío para los libros
                type: "book",
                activeNav: "home",
                error: {
                    title: "Error",
                    description: "no books found",
                },
            });
        } else {
            let librosBuscados = await Promise.all(
                librosData.data.works.map(async (libro) => {
                    const work = await axios.get(API_URL + libro.key + ".json");

                    const authors =
                        libro.authors && libro.authors.length > 0
                            ? {
                                  keys: libro.authors.map((author) => author.key),
                                  names: libro.authors.map((author) => author.name),
                              }
                            : {
                                  keys: ["No author key available"],
                                  names: ["Unknown Author"],
                              };

                    return {
                        key: libro.key,
                        title: libro.title || "No title available",
                        author_key: authors.keys || "No author key available",
                        author_name: authors.names || "Unknown Author",
                        cover_i: libro.cover_id || "No Cover Available",
                        first_publish_year: libro.first_publish_year || "Year Not Available",
                        ratings_average: libro.ratings_average || "No ratings available",
                        edition_key: [libro.cover_edition_key] || libro.cover_edition_key || "No edition key available",
                        current_edition: libro.cover_edition_key || "No edition key available",
                        description: work.data.description || "No description available",
                        subjects: work.data.subjects || "No subjects available",
                    };
                })
            );
            //console.log(librosBuscados); 
            res.status(200).render("index.ejs", { content: librosBuscados, type: "book", activeNav: "home", error: null });
        }
    } catch (error) {
        console.log(error);
        res.status(200).render("index.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "book",
            activeNav: "home",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});

//ruta para buscar libros en tendencia
app.get("/trending", async (req, res) => {
    try {
        //hacemos un get a la api de openlibrary para obtener los libros mas populares, solo 20
        const librosData = await axios.get(API_URL + "/trending/daily.json?availability&limit=20");

        // Extraemos la información de cada libro pero debemos hacer otra petición a la api para obtener la descripción y los subjects
        let librosBuscados = await Promise.all(
            librosData.data.works.map(async (libro) => {
                const work = await axios.get(API_URL + libro.key + ".json");
                
                return {
                    key: libro.key,
                    title: libro.title || "No title available",
                    author_key: libro.author_key || "No author key available",
                    author_name: libro.author_name || "Unknown Author",
                    cover_i: libro.cover_i || "No Cover Available", 
                    first_publish_year: libro.first_publish_year || "Year Not Available",
                    edition_key: [libro.cover_edition_key] || "No edition key available",
                    current_edition: libro.cover_edition_key || "No edition key available",
                    description: work.data.description || "No description available",
                    subjects: work.data.subjects || "No subjects available",
                };
            })
        );
        //console.log(req.body); 
        res.status(200).render("index.ejs", { content: librosBuscados, type: "book", activeNav: "trending", error: null });

    } catch (error) {
        res.status(200).render("index.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "book",
            activeNav: "trending",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});

//ruta para buscar libros nuevos
app.get("/new", async (req, res) => {
    try {
        //hacemos un get a la api de openlibrary para obtener los libros mas populares, solo 20
        const librosData = await axios.get(API_URL + "/trending/now.json?limit=20&sort=rating");

        // Extraemos la información de cada libro pero debemos hacer otra petición a la api para obtener la descripción y los subjects
        let librosBuscados = await Promise.all(
            librosData.data.works.map(async (libro) => {
                const work = await axios.get(API_URL + libro.key + ".json");
                
                return {
                    key: libro.key,
                    title: libro.title || "No title available",
                    author_key: libro.author_key || "No author key available",
                    author_name: libro.author_name || "Unknown Author",
                    cover_i: libro.cover_i || "No Cover Available",
                    first_publish_year: libro.first_publish_year || "Year Not Available",
                    ratings_average: libro.ratings_average || "No ratings available",
                    edition_key: [libro.cover_edition_key] || "No edition key available",
                    current_edition: libro.cover_edition_key || "No edition key available",
                    description: work.data.description || "No description available",
                    subjects: work.data.subjects || "No subjects available",
                };
            })
        );
        //console.log(req.body); 
        res.status(200).render("index.ejs", { content: librosBuscados, type: "book", activeNav: "new", error: null });

    } catch (error) {
        res.status(200).render("index.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "book",
            activeNav: "new",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});

//libros clasicos
app.get("/classics", async (req, res) => {
    try {
        //hacemos un get a la api de openlibrary para obtener los libros mas populares, solo 20
        const librosData = await axios.get(API_URL + "/subjects/accessible_book.json?limit=20#ebooks=true");

        // Extraemos la información de cada libro pero debemos hacer otra petición a la api para obtener la descripción y los subjects
        let librosBuscados = await Promise.all(
            librosData.data.works.map(async (libro) => {
                const work = await axios.get(API_URL + libro.key + ".json");

                const authors =
                    libro.authors && libro.authors.length > 0
                        ? {
                              keys: libro.authors.map((author) => author.key),
                              names: libro.authors.map((author) => author.name),
                          }
                        : {
                              keys: ["No author key available"],
                              names: ["Unknown Author"],
                          };
              
                return {
                    key: libro.key,
                    title: libro.title || "No title available",
                    author_key: authors.keys || "No author key available",
                    author_name: authors.names || "Unknown Author",
                    cover_i: libro.cover_id || "No Cover Available",
                    first_publish_year: libro.first_publish_year || "Year Not Available",
                    ratings_average: libro.ratings_average || "No ratings available",
                    edition_key: [libro.cover_edition_key] || "No edition key available",
                    current_edition: libro.cover_edition_key || "No edition key available",
                    description: work.data.description || "No description available",
                    subjects: work.data.subjects || "No subjects available",
                };
            })
        );
        //console.log(req.body); 
        res.status(200).render("index.ejs", { content: librosBuscados, type: "book", activeNav: "classics", error: null });
    } catch (error) {
        res.status(200).render("index.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "book",
            activeNav: "new",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});

//buscar un libro en especial dado que se presiono el boton de view more de un libro en especifico
//la url debe ser poe jemplo localhost:3000/book?id=/works/OL58402W
app.get("/viewBook", async (req, res) => {
    try {
        // Extraer el id del libro de la URL
        const idBook = req.query.id; 

        // Consulta a la API para obtener los datos del libro
        const librosData = await axios.get(API_URL + idBook + ".json");

        
        // Extraer información del libro
        const book = librosData.data;

        //para el autor debemos hacer una peticion dado que edition ni book traen el nombre solo el key
        const author = (await axios.get(API_URL + book.authors[0].author.key + ".json")).data;

        //en veces no existe cover_edition.key por lo que se debe hacer una validacion
        let currentEdition = {};
        if (book.cover_edition) {
             currentEdition = (await axios.get(API_URL + book.cover_edition.key + ".json")).data;
        }
        
        // Consulta a la API para obtener las ediciones del libro
        const edicionesData = await axios.get(API_URL + idBook + "/editions.json?limit=20");
        
        // Extraer ediciones
        const editions = edicionesData.data.entries || [];
        const description = book.description?.value || 'No description available';
        
        // Formatear datos para el rendering
        const content = {
            title: book.title || 'No title available',
            author_name: author.name || ['No author available'],
            description: description,
            cover_i: book.covers && book.covers.length > 0 ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-L.jpg` : 'No cover available',
            subjects: book.subjects || ['No subjects available'],
            ratings_average: book.ratings_average || 'No ratings available',
            
            title_edition: currentEdition.title || 'No title available',
            publish_date: currentEdition.publish_date || 'No publish date available',
            number_of_pages: currentEdition.number_of_pages || 'No number of pages available',
            publishers: currentEdition.publishers || ['No publishers available'],

            editions_data: editions.map(ed => ({
                title: ed.full_title || ed.title || 'No title available',
                authors: author.name || ['No authors available'],
                publish_date: ed.publish_date || 'No publish date available',
                publishers: ed.publishers || ['No publishers available']
            }))
        };

        // Renderizar la vista con los datos del libro
        console.log(content.description);
        res.render("viewBook.ejs", {
            content: content,
            type: "book",
            activeNav: "home",
            error: null
        });
    } catch (error) {
        console.log(error);
        res.status(200).render("viewBook.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "book",
            activeNav: "home",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});

//cuando se presiona el boton view more de un autor
//la url debe ser por ejemplo localhost:3000/author?id=/authors/OL7712297A
app.get("/viewAuthor", async (req, res) => {
    try {
        // El id debe estar en la forma /authors/OL7712297A
        const idAuthor = req.query.id; // Extraer el id de la URL

        // Buscar el autor en autoresBuscados por el id key, pero la id que extraemos esta en forma /authors/OL7712297A
        //y solo necesitamos el OL7712297A, podemos reemplazar el /authors/ por un espacio vacio
        const autor = autoresBuscados.find((autor) => autor.key === idAuthor.replace("/authors/", ""));

        if (autor) {
            // con los datos del autor almacenados en el array autoresBuscados bastan
            const datosGenerales = {
                key: autor.key,
                name: autor.name || "No name available",
                birth_date: autor.birth_date || "Birth date not available",
                top_work: autor.top_work || "Top work not available",
                bio: autor.bio || "Bio not available",
                subjects: autor.subjects || "No subjects available",
            };

            //console.log("Author found:", datosGenerales);
            res.status(200).render("viewBook.ejs", { content: datosGenerales, type: "book", activeNav: "home", error: null });
        } else {
            console.log("No author found");
            res.status(404).send("No author found");
        }
    } catch (error) {
        console.log(error);
        console.log(error);
        res.status(200).render("viewBook.ejs", {
            content: [], // Envía un array vacío para los libros
            type: "author",
            activeNav: "home",
            error: {
                title: "Error",
                description: error.message,
            },
        });
    }
});

app.listen(port, () => {
    console.log("Server running on port " + port);
});
