import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import Login from "./pages/login";
import POS from "./pages/pos";
import KDS from "./pages/kds";
import Admin from "./pages/admin";
import Home from "./pages/home";
import Sales from "./pages/sales";
import Purchase from "./pages/purchase";
import Products from "./pages/products";
import Expenses from "./pages/expenses";
import Reports from "./pages/reports";
import Kitchen from "./pages/kitchen";
import Settings from "./pages/settings";
import Users from "./pages/users";
import Customers from "./pages/customers";
import Tables from "./pages/tables";
import Categories from "./pages/categories";
import Ingredients from "./pages/ingredients";
import Modifiers from "./pages/modifiers";
import Promotions from "./pages/promotions";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/pos" component={POS} />
        <Route path="/kds" component={KDS} />
        <Route path="/admin" component={Admin} />
        <Route path="/home" component={Home} />
        <Route path="/sales" component={Sales} />
        <Route path="/purchase" component={Purchase} />
        <Route path="/products" component={Products} />
        <Route path="/expenses" component={Expenses} />
        <Route path="/reports" component={Reports} />
        <Route path="/kitchen" component={Kitchen} />
        <Route path="/settings" component={Settings} />
        <Route path="/users" component={Users} />
        <Route path="/customers" component={Customers} />
        <Route path="/tables" component={Tables} />
        <Route path="/categories" component={Categories} />
        <Route path="/ingredients" component={Ingredients} />
        <Route path="/modifiers" component={Modifiers} />
        <Route path="/promotions" component={Promotions} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
