import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500 // límite de 100 solicitudes por IP cada 15 minutos
});

const app = express();
const port = 3001;

const API_URL = "https://openlibrary.org";

app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan("combined")); // Log requests to the console
app.use(express.static("public")); // Use the public folder for static files.

// Aplica el limitador en la ruta raíz "/"
app.use("/", apiLimiter);

app.get("/", async (req, res) => {
    try {
        const librosData = await axios.get(API_URL + "/trending/daily.json?availability&limit=20");

        let librosBuscados = 
            librosData.data.works.map((libro) => {
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
                };
            });

        // Renderiza el contenido utilizando EJS y envía la respuesta
        res.status(200).render("index.ejs", { content: librosBuscados });
    } catch (error) {
        console.log(error);
        res.status(500).render("index.ejs", { content: error.message });
    }
});


app.listen(port, () => {
    console.log("Server running on port " + port);
});
