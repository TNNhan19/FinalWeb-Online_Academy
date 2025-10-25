import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { engine } from 'express-handlebars';
import hbs_sections from 'express-handlebars-sections';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.engine('handlebars', engine({
    helpers: {
        fillContent: hbs_sections(),
    formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value);},
        eq(a, b) {return a === b;}
}}));

app.set('view engine', 'handlebars');
app.set('views', './views');

import watchlistRoute from "./routes/watchlist.route.js";
app.use("/watchlist", watchlistRoute);


app.use(function(req, res) {
    res.status(404).render('404');
});

app.listen(3000, function (){
    console.log('Server is running on port 3000');
});