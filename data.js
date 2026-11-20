// Inventário total compartilhado da escola: reservas são feitas por tipo e quantidade.
window.INITIAL_DATA = {
  inventory: { Chromebook: 40, Tablet: 30 },
  resources: [
    { id:"r1", name:"Chromebooks", category:"Chromebook", code:"40 unidades", description:"Estoque coletivo de Chromebooks para empréstimo por aula.", status:"Disponível" },
    { id:"r2", name:"Tablets", category:"Tablet", code:"30 unidades", description:"Estoque coletivo de tablets para empréstimo por aula.", status:"Disponível" }
  ],
  reservations: [],
  slots: [
    {id:"seg1",day:"Segunda-feira",dayIndex:1,lesson:"1ª aula",time:"07:30–08:20",start:"07:30"},
    {id:"ter2",day:"Terça-feira",dayIndex:2,lesson:"2ª aula",time:"08:20–09:10",start:"08:20"},
    {id:"qua5",day:"Quarta-feira",dayIndex:3,lesson:"5ª aula",time:"11:05–11:55",start:"11:05"},
    {id:"qua6",day:"Quarta-feira",dayIndex:3,lesson:"6ª aula",time:"11:55–12:45",start:"11:55"}
  ]
};